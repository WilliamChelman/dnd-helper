import { Entity } from './entity';

export interface Species extends Entity {
  type: 'Species';
  isLegacy?: boolean;
  source?: string;
  sourceDetails?: string;
}
