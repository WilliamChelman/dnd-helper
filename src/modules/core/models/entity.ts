import { EntityType } from './entity-type';

export interface OldEntity {
  uri: string;
  entityType: string;
  name: string;
  dataSource: string;
  lang: string;
  sameAs?: string[];
  id?: string;
  altNames?: string[];
  markdownContent?: string;
  htmlContent?: string;
  pages?: OldEntity[];
  attachments?: OldAttachment[];
}

export interface OldAttachment {
  url: string;
  filePath: string;
}

export interface Entity {
  uri: string;
  type: EntityType;
  name: string;
  dataSource: DataSource;
  lang: string;
  textContent: string;
  tags?: string[];
}

export type DataSource = 'DDB' | '5e-drs' | 'aide-dd';
