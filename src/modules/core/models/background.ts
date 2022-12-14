import { Entity } from './entity';

export interface Background extends Entity {
  type: 'Background';
  source?: string;
}
