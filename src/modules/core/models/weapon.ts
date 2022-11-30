import { OldItem } from './item';

export interface OldWeapon extends OldItem {
  damages?: string;
  damageType?: string;
  properties?: string[];
}
