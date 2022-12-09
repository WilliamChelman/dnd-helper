import { Injectable } from 'injection-js';

import { ConfigService, Entity, EntityType } from '../../core';
import { DefaultMdOutput } from '../../markdown-yaml';

@Injectable()
export abstract class FiveEDrsEntityMdOutput<T extends Entity> extends DefaultMdOutput<T> {
  abstract entityType: EntityType;

  constructor(protected configService: ConfigService) {
    super(configService);
  }

  canHandle(entity: T): number | undefined {
    return entity.dataSource === '5e-drs' && this.entityType === entity.type ? 10 : undefined;
  }
}
