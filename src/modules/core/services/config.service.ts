import { cosmiconfigSync } from 'cosmiconfig';
import path from 'path';
import { defu } from 'defu';
import { getBinRootPath } from '../utils';
import { EntityType } from '../models';
const explorerSync = cosmiconfigSync('dnd-parser');

export class ConfigService {
  config: Config;

  private readonly defaultConfig: Config = {
    cachePath: path.join(getBinRootPath(), 'cache'),
    ddb: {
      includeSourcePages: true,
    },
    markdownYaml: {
      distPath: path.join(process.cwd(), '../dnd-parser-test/vault'),
      folderEntityTypeMap: {
        MagicItem: 'Magic Items',
        Monster: 'Monsters',
        Source: 'Books',
        SourcePage: undefined,
        Spell: 'Spells',
        Item: 'Items',
        Feat: 'Feats',
        Background: 'Backgrounds',
        Class: 'Classes',
        Subclass: 'Subclasses',
        Species: 'Species',
      },
    },
  };

  constructor() {
    this.config = defu(explorerSync.search()?.config, this.defaultConfig);
  }
}

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
  };
}

export interface FlowConfig {
  sources: { [daoId: string]: boolean | DaoConfig };
  destinations: { [daoId: string]: boolean | DaoConfig };
  disabled?: boolean;
}

export type DaoConfig = { id: string };
