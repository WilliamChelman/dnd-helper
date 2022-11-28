export interface Entity {
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
  pages?: Entity[];
  attachments?: Attachment[];
}

export interface Attachment {
  url: string;
  filePath: string;
}

export interface NewEntity {
  uri: string;
  type: string;
  name: string;
  dataSource: string;
  lang: string;
  textContent: string;
}
