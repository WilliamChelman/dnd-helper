import { Entity } from "./entity";

export interface Monster extends Entity {
  id: string;
  name: string;
  dataSource: string;
  lang: string;
  altNames?: string[];
  link?: string;
  iconLink?: string;
  challenge?: string;
  source?: string;
  sourceDetails?: string;
  type?: string;
  subtype?: string;
  size?: string;
  alignment?: string;
  environment?: string[];
  armorClass?: number;
  avgHitPoints?: number;
  senses?: string[];
  saveProficiencies?: string[];
  skillProficiencies?: string[];
  isLegendary?: boolean;
  isMythic?: boolean;
  isLegacy?: boolean;
  hasLair?: boolean;
  resistances?: string[];
  damageImmunities?: string[];
  conditionImmunities?: string[];
  vulnerabilities?: string[];
  languages?: string[];
  movementTypes?: string[];
  tags?: string[];
  coverLink?: string;
  htmlContent?: string;
  sameAs?: string[];
}
