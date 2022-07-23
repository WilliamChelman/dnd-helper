import { Injectable } from "injection-js";

import { DdbSpellsService } from "../../ddb";
import { NotionSpellsService } from "../../notion";
import { Command } from "../models";

@Injectable()
export class DdbSpellsCommand implements Command<void> {
  constructor(private ddbSpellsService: DdbSpellsService, private notionSpellsService: NotionSpellsService) {}

  async run(): Promise<void> {
    try {
      await this.notionSpellsService.initSchema();
      const spells = await this.ddbSpellsService.getSpells();
      let index = 0;
      for (let spell of spells) {
        console.group(`Processing ${index}/${spells.length - 1} - ${spell.name}`);
        console.time("Took");
        await this.notionSpellsService.addPage(spell);
        ++index;
        console.timeEnd("Took");
        console.groupEnd();
      }
    } catch (err) {
      console.error(err);
    } finally {
      console.log("DONE");
    }
  }
}
