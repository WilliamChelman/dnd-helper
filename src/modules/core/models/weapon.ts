import { Item } from "./item";

export interface Weapon extends Item {
  damages?: string;
  damageType?: string;
  properties?: string[];
}
