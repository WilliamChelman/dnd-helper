import { Entity, OldEntity } from './entity';

export interface OldItem extends OldEntity {
  type?: string;
  cost?: string;
  weight?: string;
  tags?: string[];
  notes?: string[];
}

export interface Item extends Entity {
  type: 'Item';
  cost?: string;
  weight?: string;
  tags?: string[];
  notes?: string[];
}
