import { cosmiconfigSync } from 'cosmiconfig';
import { join } from 'path';
import { getBinRootPath } from '../utils';
const explorerSync = cosmiconfigSync('dnd-parser');

export class ConfigService {
  config: Config;

  constructor() {
    this.config = explorerSync.search()?.config;
    if (!this.config.cachePath) {
      this.config.cachePath = join(getBinRootPath(), 'cache');
    }
  }
}

export interface Config {
  cachePath: string;
  flows: FlowConfig[];
  defaultDaoConfigs?: { [daoId: string]: DaoConfig };
  notion: {
    auth: string;
    spellsDbId: string;
    monstersDbId: string;
    itemsDbId: string;
  };
  ddb: {
    cobaltSession: string;
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
