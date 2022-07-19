import { cosmiconfigSync } from "cosmiconfig";
const explorerSync = cosmiconfigSync("dnd-parse");

export class ConfigService {
  config: Config = explorerSync.search()?.config;
}

export interface Config {
  notion: {
    auth: string;
    spellsDbId: string;
  };
  ddb: {
    cobaltSession: string;
  };
}
