import { Entity } from './entity';

export interface PlayerClass extends Entity {
  type: 'Class';
  subclasses?: PlayerSubclass[];
}

export interface PlayerSubclass extends Entity {
  type: 'Subclass';
  baseClass?: string;
  baseClassUri?: string;
  source?: string;
}
