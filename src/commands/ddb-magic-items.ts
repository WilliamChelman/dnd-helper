import 'reflect-metadata';

import { Command } from '@oclif/core';

import { DdbMagicItemsDao } from '../modules/ddb';
import { getInjector } from '../modules/main';
import { MarkdownYamlEntitiesDao } from '../modules/markdown-yaml';

export default class DdbMagicItems extends Command {
  static description = 'Run the parser';

  static examples = [
    `<%= config.bin %> <%= command.id %>
hello world! (./src/commands/hello/world.ts)
`,
  ];

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    this.log('Hello!');
    // main();
    const ddbMagicItemsDao = getInjector().get(DdbMagicItemsDao) as DdbMagicItemsDao;
    const mdDao = getInjector().get(MarkdownYamlEntitiesDao) as MarkdownYamlEntitiesDao;
    this.log('You');
    const items = await ddbMagicItemsDao.getAll();
    for (const item of items) {
      await mdDao.save(item);
    }
    this.log(`Gotten items! ${items.length}`);
  }
}
