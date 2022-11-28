import 'reflect-metadata';

import { Command } from '@oclif/core';

import { DdbMagicItemsInput, DdbMagicItemsMdOutput, DdbMonstersInput, DdbMonstersMdOutput, DdbSpellsMdOutput } from '../modules/ddb';
import { getInjector } from '../modules/main';
import { DdbSpellsInput } from '../modules/ddb';
import { DefaultMdOutput } from '../modules/markdown-yaml';

export default class Ddb extends Command {
  static description = 'Run the parser';

  static examples = [
    `<%= config.bin %> <%= command.id %>
hello world! (./src/commands/hello/world.ts)
`,
  ];

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    const defaultOutput = getInjector().get(DefaultMdOutput) as DefaultMdOutput;
    const magicItemsInput = getInjector().get(DdbMagicItemsInput) as DdbMagicItemsInput;
    const magicItemsOutput = getInjector().get(DdbMagicItemsMdOutput) as DdbMagicItemsMdOutput;
    const spellsInput = getInjector().get(DdbSpellsInput) as DdbSpellsInput;
    const spellsOutput = getInjector().get(DdbSpellsMdOutput) as DdbSpellsMdOutput;
    const monstersInput = getInjector().get(DdbMonstersInput) as DdbMonstersInput;
    const monstersOutput = getInjector().get(DdbMonstersMdOutput) as DdbMonstersMdOutput;

    const items = monstersInput.getAll();
    // const items = spellsInput.getAll();
    // const items = magicItemsInput.getAll();

    for await (const item of items) {
      await monstersOutput.export([item]);
      // await spellsOutput.export([item]);
      // await magicItemsOutput.export([item]);
    }
    // this.log(`Gotten items! ${items.length}`);
  }
}
