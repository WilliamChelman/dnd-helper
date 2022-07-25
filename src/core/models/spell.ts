import { Entity } from "./entity";

export interface Spell extends Entity {
  entityType: "Spell";
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
  htmlContent?: string;
  attackOrSave?: string;
  damageOrEffect?: string;
  tags?: string[];
  sameAs?: string[];
  altNames?: string[];
}
