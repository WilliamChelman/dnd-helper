import { OldEntity, Entity } from './entity';

export interface OldMonster extends OldEntity {
  entityType: 'Monster';
  id: string;
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
}

export interface Monster extends Entity {
  type: 'Monster';
  altNames?: string[];
  challenge?: string;
  source?: string;
  sourceDetails?: string;
  monsterType?: string;
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
}
