import { Injectable, Injector } from 'injection-js';
import path from 'path';

import { Entity, EntityType } from '../../core';
import { DefaultMdOutput } from '../../markdown-yaml';
import { DdbMdHelper } from './ddb-md.helper';

@Injectable()
export abstract class DdbEntityMdOutput<T extends Entity> extends DefaultMdOutput<T> {
  protected abstract entityType: EntityType;
  protected ddbMdHelper: DdbMdHelper = this.injector.get(DdbMdHelper);

  constructor(injector: Injector) {
    super(injector);
  }

  canHandle(entity: T): number | undefined {
    return entity.dataSource === 'ddb' && entity.type === this.entityType ? 10 : undefined;
  }

  protected async getFilePath(entity: T, basePath: string): Promise<string> {
    return path.join(basePath, await this.ddbMdHelper.uriToMdPath(entity.uri, entity.uri)) + '.md';
  }
}
