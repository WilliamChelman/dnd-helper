import { cosmiconfigSync } from 'cosmiconfig';
import { defu } from 'defu';
import path from 'path';

import { Config } from '../models';
import { getBinRootPath } from '../utils';

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
      typeConfig: {
        MagicItem: {
          folderName: 'Magic Items',
          infobox: { imageSize: null },
        },
        Spell: {
          folderName: 'Spells',
          infobox: { imageSize: 'small' },
        },
        Monster: {
          folderName: 'Monsters',
          infobox: { imageSize: null },
        },
        Item: {
          folderName: 'Items',
          infobox: { imageSize: 'small' },
        },
      },
    },
  };

  constructor() {
    this.config = defu(explorerSync.search()?.config, this.defaultConfig);
  }
}
