import { OldEntity } from './entity';

export interface OldItem extends OldEntity {
  type?: string;
  cost?: string;
  weight?: string;
  tags?: string[];
  notes?: string[];
}
