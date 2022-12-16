import { OldEntity, Entity } from './entity';

export interface OldMagicItem extends OldEntity {}

export interface MagicItem extends Entity {
  type: 'MagicItem';
  magicItemType?: string;
  magicItemSubType?: string;
  rarity?: string;
  attunement?: boolean;
  classes?: string[];
  isVariant?: boolean;
}
