import { OldEntity, Entity } from './entity';

export interface OldMagicItem extends OldEntity {}

export interface MagicItem extends Entity {
  type: 'MagicItem';
}
