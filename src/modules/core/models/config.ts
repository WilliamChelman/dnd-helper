import { EntityType } from './entity-type';

export interface Config {
  cachePath: string;
  noCache?: boolean;
  force?: boolean;
  flows?: FlowConfig[];
  defaultDaoConfigs?: { [daoId: string]: DaoConfig };
  notion?: {
    auth: string;
    spellsDbId: string;
    monstersDbId: string;
    itemsDbId: string;
  };
  ddb?: {
    cobaltSession?: string;
    types?: string[];
    name?: string;
    sourceName?: string;
    includeSourcePages?: boolean;
  };
  webScrapper?: {
    pathToChromeBinary?: string;
  };
  markdownYaml?: {
    distPath: string;
    folderEntityTypeMap: { [key in EntityType]: string | undefined };
    typeConfig: {
      MagicItem: MdMagicItemConfig;
      Spell: MdSpellConfig;
      Monster: MdMonsterConfig;
      Item: MdItemConfig;
      Source: MdSourceConfig;
      Species: MdSpeciesConfig;
      Class: MdClassConfig;
    };
  };
}

export interface FlowConfig {
  sources: { [daoId: string]: boolean | DaoConfig };
  destinations: { [daoId: string]: boolean | DaoConfig };
  disabled?: boolean;
}

export type DaoConfig = { id: string };

export interface MdTypeConfig {
  folderName: string;
}

export interface MdMagicItemConfig extends MdTypeConfig {
  infobox: InfoBoxOptions | false;
}

export interface MdSpellConfig extends MdTypeConfig {
  infobox: InfoBoxOptions | false;
}

export interface MdMonsterConfig extends MdTypeConfig {
  infobox: InfoBoxOptions | false;
}

export interface MdItemConfig extends MdTypeConfig {
  infobox: InfoBoxOptions | false;
}

export interface MdSpeciesConfig extends MdTypeConfig {
  infobox: InfoBoxOptions | false;
}

export interface MdClassConfig extends MdTypeConfig {
  infobox: InfoBoxOptions | false;
}

export interface MdSourceConfig extends MdTypeConfig {
  useFolderNoteForSourceRoot: boolean;
}

export interface InfoBoxOptions {
  imageSize: 'small' | 'medium' | null;
}
