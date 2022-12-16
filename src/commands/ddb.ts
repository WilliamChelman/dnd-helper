import 'reflect-metadata';

import { Command } from '@oclif/core';

import { ConfigService, DataSource, ExitCleaner, InputService, OutputService } from '../modules/core';
import { getInjector } from '../modules/main';

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
    const outputFormat = 'md';
    const sourceId: DataSource = 'ddb';
    const injector = getInjector();
    const { config } = injector.get(ConfigService) as ConfigService;
    const inputs = injector.get(InputService) as InputService[];
    const outputs = injector.get(OutputService) as OutputService[];
    const cleaners = injector.get(ExitCleaner) as ExitCleaner[];
    const types = config.ddb?.types ?? [];

    try {
      for (const input of inputs) {
        if (input.sourceId !== sourceId || !(types.length ? types.some(type => input.canHandle(type)) : true)) {
          continue;
        }
        for await (const entity of input.getAll()) {
          for (const output of outputs) {
            if (output.format !== outputFormat || !output.canHandle(entity)) {
              continue;
            }
            await output.export([entity]);
          }
        }
      }
    } finally {
      cleaners.forEach(c => c.clean());
    }
  }
}
