import { Command } from '@oclif/core';

export default class Parse extends Command {
  static description = 'Run the parser';

  static examples = [
    `<%= config.bin %> <%= command.id %>
hello world! (./src/commands/hello/world.ts)
`,
  ];

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    // main();
    this.log('hello world! (./src/commands/hello/world.ts)');
  }
}
