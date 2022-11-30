import { cosmiconfigSync } from 'cosmiconfig';
import path from 'path';
import { defu } from 'defu';
import { getBinRootPath } from '../utils';
const explorerSync = cosmiconfigSync('dnd-parser');

export class ConfigService {
  config: Config;

  private readonly defaultConfig: Config = {
    cachePath: path.join(getBinRootPath(), 'cache'),
    markdownYaml: {
      distPath: path.join(process.cwd(), 'vault'),
      ddbVaultPath: 'ddb',
    },
  };

  constructor() {
    this.config = defu(explorerSync.search()?.config, this.defaultConfig);
  }
}

export interface Config {
  cachePath: string;
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
  };
  markdownYaml?: {
    distPath: string;
    ddbVaultPath: string;
  };
}

export interface FlowConfig {
  sources: { [daoId: string]: boolean | DaoConfig };
  destinations: { [daoId: string]: boolean | DaoConfig };
  disabled?: boolean;
}

export type DaoConfig = { id: string };
