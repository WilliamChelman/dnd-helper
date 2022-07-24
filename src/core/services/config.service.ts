import { cosmiconfigSync } from "cosmiconfig";
const explorerSync = cosmiconfigSync("dnd-parse");

export class ConfigService {
  config: Config = explorerSync.search()?.config;
}

export interface Config {
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
