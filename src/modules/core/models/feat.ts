import { Entity } from './entity';

export interface Feat extends Entity {
  type: 'Feat';
  halfFeat?: string[];
  source?: string;
}
