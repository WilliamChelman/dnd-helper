import { Entity } from "./entity";

export interface Item extends Entity {
  uri: string;
  dataSource: string;
  lang: string;
  name: string;
  type?: string;
  cost?: string;
  weight?: string;
  tags?: string[];
  htmlContent?: string[];
}
