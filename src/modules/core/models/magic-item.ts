import { Entity, NewEntity } from './entity';

export interface MagicItem extends Entity {}

export interface NewMagicItem extends NewEntity {
  type: 'MagicItem';
}
