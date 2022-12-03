import 'reflect-metadata';

import { Command } from '@oclif/core';

import { ConfigService, InputService, NewPageService, OutputService, PageServiceFactory } from '../modules/core';
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
    const sourceId = 'DDB';
    const injector = getInjector();
    const { config } = injector.get(ConfigService) as ConfigService;
    const inputs = injector.get(InputService) as InputService[];
    const outputs = injector.get(OutputService) as OutputService[];
    const pageServiceFactory = injector.get(PageServiceFactory) as PageServiceFactory;
    const newPageService = injector.get(NewPageService) as NewPageService;

    try {
      for (const input of inputs) {
        if (input.sourceId !== sourceId || !config.ddb?.types?.some(type => input.canHandle(type))) {
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
      pageServiceFactory.closeAll();
      newPageService.close();
    }
  }
}
