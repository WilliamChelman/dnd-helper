import { OldEntity, Entity } from './entity';

export interface OldSource extends OldEntity {}

export interface Source extends Entity {
  type: 'Source';
  pages?: SourcePage[];
}

export interface SourcePage extends Entity {
  type: 'SourcePage';
  sourceUri: string;
}
