import { Entity } from "../models";

export abstract class EntityDao<T extends Entity = Entity> {
  abstract id: string;
  abstract getAll(): Promise<T[]>;
  abstract getByUri(uri: string): Promise<T>;
  abstract save(entity: T): Promise<string>;
  abstract patch(entity: T): Promise<string>;
  abstract canHandle(entityType: string): number;
}

export type SourceEntityDao<T extends Entity> = Pick<EntityDao<T>, "id" | "getAll">;
export type DestinationEntityDao<T extends Entity> = Pick<EntityDao<T>, "id" | "save" | "patch">;
