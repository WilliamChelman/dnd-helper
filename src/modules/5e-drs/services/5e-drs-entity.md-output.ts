import { Injectable } from 'injection-js';
import { memoize } from 'lodash';
import { promises as fs } from 'fs';
import yaml from 'yaml';

import { ConfigService, Entity, EntityType } from '../../core';
import { DefaultMdOutput } from '../../markdown-yaml';
import path from 'path';

@Injectable()
export abstract class FiveEDrsEntityMdOutput<T extends Entity> extends DefaultMdOutput<T> {
  abstract entityType: EntityType;

  constructor(protected configService: ConfigService) {
    super(configService);
    this.getAllExistingNames = memoize(this.getAllExistingNames.bind(this));
  }

  canHandle(entity: T): number | undefined {
    return entity.dataSource === '5e-drs' && this.entityType === entity.type ? 10 : undefined;
  }

  protected async getFilePath(entity: T, basePath: string): Promise<string> {
    let filePath = await super.getFilePath(entity, basePath);
    return filePath.replace('.md', ' (FR).md');
  }

  protected async canBeSaved(entity: T): Promise<boolean> {
    const folder = await this.getFolderPath(entity, this.getBasePath());
    const names = await this.getAllExistingNames(folder);
    return !names.includes(entity.name);
  }

  private async getAllExistingNames(folder: string): Promise<string[]> {
    const fileNames = await fs.readdir(folder);
    const names: string[] = [];

    for (const fileName of fileNames) {
      const filePath = path.join(folder, fileName);
      const content = await fs.readFile(filePath, 'utf8');
      const parsed = yaml.parseAllDocuments(content);
      const entity = parsed[0].toJSON() as Entity;

      if (entity.lang === 'fr' && entity.dataSource !== '5e-drs') {
        names.push(entity.name, ...(entity.altNames ?? []));
      }
    }

    return names;
  }
}
