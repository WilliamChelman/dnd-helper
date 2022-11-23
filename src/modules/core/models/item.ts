import { Entity } from "./entity";

export interface Item extends Entity {
  type?: string;
  cost?: string;
  weight?: string;
  tags?: string[];
  notes?: string[];
}
