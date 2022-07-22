import { Injectable } from "injection-js";
import { AideDdSpellsService } from "../../aidedd";
import { DdbSpellsService } from "../../ddb";
import { NotionSpellsService } from "../../notion";
import { Command } from "../models";

@Injectable()
export class SpellsCommands implements Command<void> {
  constructor(
    private ddbSpellsService: DdbSpellsService,
    private aideDdSpellService: AideDdSpellsService,
    private notionSpellsService: NotionSpellsService
  ) {}

  async run(): Promise<void> {
    try {
      const spells = await this.ddbSpellsService.getSpells({ name: "fireball" });
      for (const spell of spells) {
        const fr = await this.aideDdSpellService.getFrenchData(spell.name!);
        if (fr) {
          Object.assign(spell, fr);
        } else {
          console.warn("Failed to find  French version of", spell.name);
        }
      }
      await this.notionSpellsService.initSchema();
      await this.notionSpellsService.addPages(spells);
    } catch (err) {
      console.error(err);
    } finally {
      console.log("DONE");
    }
  }
}
