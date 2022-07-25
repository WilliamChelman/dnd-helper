export interface Entity {
  uri: string;
  entityType: string;
  name: string;
  dataSource: string;
  lang: string;
  sameAs?: string[];
  altNames?: string[];
  markdownContent?: string;
}
