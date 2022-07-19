import "reflect-metadata";

import { ReflectiveInjector } from "injection-js";

import { ConfigService, HtmlElementHelper, PageServiceFactory } from "./core";
import { DdbSpellsService } from "./ddb";
import { NotionHelper, NotionSpellsService } from "./notion";
import { AideDdSpellsService } from "./aidedd";

async function main() {
  const injector = ReflectiveInjector.resolveAndCreate([
    PageServiceFactory,
    DdbSpellsService,
    HtmlElementHelper,
    ConfigService,
    NotionSpellsService,
    NotionHelper,
    AideDdSpellsService,
  ]);
  const pageServiceFactory = injector.get(PageServiceFactory) as PageServiceFactory;
  const ddbService = injector.get(DdbSpellsService) as DdbSpellsService;
  const aideDdSpellService = injector.get(AideDdSpellsService) as AideDdSpellsService;
  const notionSpellsService = injector.get(NotionSpellsService) as NotionSpellsService;
  try {
    const spells = await ddbService.getSpells();
    for (const spell of spells) {
      const fr = await aideDdSpellService.getFrenchData(spell.name);
      if (fr) {
        Object.assign(spell, fr);
      } else {
        console.warn("Failed to find  French version of", spell.name);
      }
    }
    await notionSpellsService.initSchema();
    await notionSpellsService.addPages(spells);
  } catch (err) {
    console.error(err);
  } finally {
    await pageServiceFactory.closeAll();
    console.log("DONE");
  }
}

main();
