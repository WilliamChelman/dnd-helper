import { cosmiconfigSync } from "cosmiconfig";
const explorerSync = cosmiconfigSync("dnd-parse");

export class ConfigService {
  config: Config = explorerSync.search()?.config;
}

export interface Config {
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
    spells?: boolean;
    monsters?: boolean;
    items?: boolean;
  };
  aidedd: {
    spells?: boolean;
    monsters?: boolean;
  };
  drs5e: {
    spells?: boolean;
    monsters?: boolean;
  };
}

export interface FlowConfig {
  sources: { [daoId: string]: boolean | DaoConfig };
  destinations: { [daoId: string]: boolean | DaoConfig };
  disabled?: boolean;
}

export type DaoConfig = { id: string };
