import { HTMLElement } from "node-html-parser";

export interface Spell {
  level?: string;
  name?: string;
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
  link?: string;
  nameFr?: string;
  linkFr?: string;
}
