import { OldEntity, Entity } from './entity';

export interface OldSource extends OldEntity {}

export interface Source extends Entity {
  type: 'Source';
  pagesUris?: string[];
}

export interface SourcePage extends Entity {
  type: 'SourcePage';
  sourceUri: string;
}
