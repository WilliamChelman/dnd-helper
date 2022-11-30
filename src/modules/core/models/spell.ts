import { OldEntity, Entity } from './entity';

export interface OldSpell extends OldEntity {
  entityType: 'Spell';
  id: string;
  level?: string;
  school?: string;
  castingTime?: string;
  rangeAndArea?: string;
  duration?: string;
  components?: string;
  source?: string;
  sourceDetails?: string;
  spellLists?: string[];
  concentration?: boolean;
  ritual?: boolean;
  attackOrSave?: string;
  damageOrEffect?: string;
  tags?: string[];
  altNames?: string[];
}

export interface Spell extends Entity {
  type: 'Spell';
  level?: string;
  school?: string;
  castingTime?: string;
  rangeAndArea?: string;
  duration?: string;
  components?: string;
  source?: string;
  sourceDetails?: string;
  spellLists?: string[];
  concentration?: boolean;
  ritual?: boolean;
  attackOrSave?: string;
  damageOrEffect?: string;
  tags?: string[];
  altNames?: string[];
}
