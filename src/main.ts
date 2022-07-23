import { ReflectiveInjector } from "injection-js";
import "reflect-metadata";
import { DrsMonstersService } from "./5e-drs";
import { DrsSpellsService } from "./5e-drs/services/5e-drs-spells.service";
import { AideDdMonstersService, AideDdSpellsService } from "./aidedd";

import { AideDdMonstersCommands, DdbMonstersCommands, DrsMonstersCommand, DdbSpellsCommand } from "./commands";
import { DrsSpellsCommand } from "./commands/services/5e-drs-spells.command";
import { AideDdSpellsCommand } from "./commands/services/aidedd-spells.command";
import { PageServiceFactory, HtmlElementHelper, ConfigService, LabelsHelper, AssetsService } from "./core";
import { DdbHelper, DdbMonstersService, DdbSpellsService } from "./ddb";
import { NotionSpellsService, NotionHelper, NotionMonstersService } from "./notion";

async function main() {
  const injector = ReflectiveInjector.resolveAndCreate([
    AideDdMonstersCommands,
    AideDdMonstersService,
    AideDdSpellsCommand,
    AideDdSpellsService,
    ConfigService,
    DdbHelper,
    DdbMonstersCommands,
    DdbMonstersService,
    DdbSpellsCommand,
    DdbSpellsService,
    DrsSpellsCommand,
    DrsSpellsService,
    DrsMonstersCommand,
    DrsMonstersService,
    AssetsService,
    HtmlElementHelper,
    NotionHelper,
    NotionMonstersService,
    NotionSpellsService,
    PageServiceFactory,
    LabelsHelper,
  ]);
  const configService = injector.get(ConfigService) as ConfigService;
  const pageServiceFactory = injector.get(PageServiceFactory) as PageServiceFactory;
  const ddbSpellsCommands = injector.get(DdbSpellsCommand) as DdbSpellsCommand;
  const ddbMonstersCommands = injector.get(DdbMonstersCommands) as DdbMonstersCommands;
  const aideDdMonstersCommands = injector.get(AideDdMonstersCommands) as AideDdMonstersCommands;
  const aideDdSpellsCommands = injector.get(AideDdSpellsCommand) as AideDdSpellsCommand;
  const drsSpellsCommands = injector.get(DrsSpellsCommand) as DrsSpellsCommand;
  const drsMonstersCommands = injector.get(DrsMonstersCommand) as DrsMonstersCommand;
  try {
    if (configService.config.ddb?.spells) {
      await ddbSpellsCommands.run();
    }
    if (configService.config.ddb?.monsters) {
      await ddbMonstersCommands.run();
    }
    if (configService.config.aidedd?.spells) {
      await aideDdSpellsCommands.run();
    }
    if (configService.config.aidedd?.monsters) {
      await aideDdMonstersCommands.run();
    }
    if (configService.config.drs5e?.spells) {
      await drsSpellsCommands.run();
    }
    if (configService.config.drs5e?.monsters) {
      await drsMonstersCommands.run();
    }
  } finally {
    pageServiceFactory.closeAll();
  }
}

main();
