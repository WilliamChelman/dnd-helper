import { OldEntity, Entity } from '../models';

export abstract class EntityDao<T extends OldEntity = OldEntity> {
  abstract id: string;
  abstract getAll(): Promise<T[]>;
  abstract getByUri(uri: string): Promise<T>;
  abstract save(entity: T): Promise<string>;
  abstract patch(entity: T): Promise<string>;
  abstract canHandle(entityType: string): number;
}

export type SourceEntityDao<T extends OldEntity> = Pick<EntityDao<T>, 'id' | 'getAll'>;
export type DestinationEntityDao<T extends OldEntity> = Pick<EntityDao<T>, 'id' | 'save' | 'patch'>;

export abstract class OutputService<T extends Entity = Entity> {
  abstract format: string;
  abstract canHandle(entity: T): number | undefined;
  abstract export(entities: T[]): Promise<string[]>;
}

export abstract class InputService<T extends Entity = Entity> {
  abstract sourceId: string;
  abstract canHandle(entityType: string): number | undefined;
  abstract getAll(): AsyncGenerator<T>;
}
