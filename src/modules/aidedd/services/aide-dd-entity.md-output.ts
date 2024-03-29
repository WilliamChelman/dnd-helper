import { Injectable, Injector } from 'injection-js';

import { Entity, EntityType } from '../../core';
import { DefaultMdOutput } from '../../markdown-yaml';

@Injectable()
export abstract class AideDdEntityMdOutput<T extends Entity> extends DefaultMdOutput<T> {
  abstract entityType: EntityType;

  constructor(injector: Injector) {
    super(injector);
  }

  canHandle(entity: T): number | undefined {
    return entity.dataSource === 'aide-dd' && this.entityType === entity.type ? 10 : undefined;
  }

  protected async getFilePath(entity: T, basePath: string): Promise<string> {
    let filePath = await super.getFilePath(entity, basePath);
    return filePath.replace('.md', ' (FR).md');
  }
}
