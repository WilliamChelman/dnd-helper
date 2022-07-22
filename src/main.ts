import { ReflectiveInjector } from "injection-js";
import "reflect-metadata";
import { DrsMonstersService } from "./5e-drs";
import { AideDdMonstersService, AideDdSpellsService } from "./aidedd";

import { AideDdMonstersCommands, DdbMonstersCommands, DrsMonstersCommand, SpellsCommands } from "./commands";
import { PageServiceFactory, HtmlElementHelper, ConfigService } from "./core";
import { DdbHelper, DdbMonstersService, DdbSpellsService } from "./ddb";
import { NotionSpellsService, NotionHelper, NotionMonstersService } from "./notion";

async function main() {
  const injector = ReflectiveInjector.resolveAndCreate([
    PageServiceFactory,
    DdbSpellsService,
    HtmlElementHelper,
    ConfigService,
    NotionSpellsService,
    NotionHelper,
    AideDdSpellsService,
    SpellsCommands,
    DdbHelper,
    DdbMonstersService,
    DdbMonstersCommands,
    NotionMonstersService,
    AideDdMonstersService,
    AideDdMonstersCommands,
    DrsMonstersService,
    DrsMonstersCommand,
  ]);
  const configService = injector.get(ConfigService) as ConfigService;
  const pageServiceFactory = injector.get(PageServiceFactory) as PageServiceFactory;
  const spellsCommands = injector.get(SpellsCommands) as SpellsCommands;
  const ddbMonstersCommands = injector.get(DdbMonstersCommands) as DdbMonstersCommands;
  const aideDdMonstersCommands = injector.get(AideDdMonstersCommands) as AideDdMonstersCommands;
  const drsMonstersCommands = injector.get(DrsMonstersCommand) as DrsMonstersCommand;
  try {
    // await spellsCommands.run();
    if (configService.config.ddb?.monsters) {
      await ddbMonstersCommands.run();
    }
    if (configService.config.aidedd?.monsters) {
      await aideDdMonstersCommands.run();
    }
    if (configService.config.srd5e?.monsters) {
      await drsMonstersCommands.run();
    }
  } finally {
    pageServiceFactory.closeAll();
  }
}

main();
