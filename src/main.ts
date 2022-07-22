import { ReflectiveInjector } from "injection-js";
import "reflect-metadata";
import { DrsMonstersService } from "./5e-drs";
import { AideDdMonstersService, AideDdSpellsService } from "./aidedd";

import { AideDdMonstersCommands, DdbMonstersCommands, DrsMonstersCommands, SpellsCommands } from "./commands";
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
    DrsMonstersCommands,
  ]);
  const pageServiceFactory = injector.get(PageServiceFactory) as PageServiceFactory;
  const spellsCommands = injector.get(SpellsCommands) as SpellsCommands;
  const ddbMonstersCommands = injector.get(DdbMonstersCommands) as DdbMonstersCommands;
  const aideDdMonstersCommands = injector.get(AideDdMonstersCommands) as AideDdMonstersCommands;
  const drsMonstersCommands = injector.get(DrsMonstersCommands) as DrsMonstersCommands;
  try {
    // await spellsCommands.run();
    // await ddbMonstersCommands.run();
    // await aideDdMonstersCommands.run();
    await drsMonstersCommands.run();
  } finally {
    pageServiceFactory.closeAll();
  }
}

main();
