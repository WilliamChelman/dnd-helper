import { Injectable } from 'injection-js';
import path from 'path';

import { ConfigService, Entity, EntityType } from '../../core';
import { DefaultMdOutput } from '../../markdown-yaml';
import { DdbMdHelper } from './ddb-md.helper';

@Injectable()
export abstract class DdbEntityMdOutput<T extends Entity> extends DefaultMdOutput<T> {
  protected abstract entityType: EntityType;

  constructor(protected configService: ConfigService, protected ddbMdHelper: DdbMdHelper) {
    super(configService);
  }

  canHandle(entity: T): number | undefined {
    return entity.type === this.entityType ? 10 : undefined;
  }

  protected async getFilePath(entity: T, basePath: string): Promise<string> {
    return path.join(basePath, await this.ddbMdHelper.urlToMdUrl(entity.uri, entity.uri)) + '.md';
  }
}
