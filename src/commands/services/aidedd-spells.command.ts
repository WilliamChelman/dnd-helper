import { Injectable } from "injection-js";

import { AideDdSpellsService } from "../../aidedd";
import { Spell } from "../../core";
import { NotionSpellsService } from "../../notion";
import { Command } from "../models";

@Injectable()
export class AideDdSpellsCommand implements Command<void> {
  constructor(private notionService: NotionSpellsService, private aideDd: AideDdSpellsService) {}

  async run(): Promise<void> {
    try {
      await this.notionService.initSchema();
      const spells = await this.aideDd.getPartialSpells();
      let index = 0;
      for (let spell of spells) {
        console.group(`Processing ${index}/${spells.length - 1} - ${spell.name}`);
        console.time("Took");
        spell = await this.aideDd.completeSpellWithDetailPage(spell);
        let partialSameAs: Spell | undefined = undefined;
        const names = [spell.name, ...(spell.altNames ?? [])];
        for (const altName of names) {
          let searchName = altName?.trim();
          partialSameAs = { name: searchName, dataSource: "DDB" } as Spell;
          const sameAs = await this.notionService.getByNameAndDataSource(partialSameAs);
          if (sameAs) {
            spell.altNames = spell.altNames?.filter((n) => n !== altName);
            spell.sameAs = [sameAs];
            break;
          }
        }
        const spellId = await this.notionService.addPage(spell);
        if (spell.sameAs && partialSameAs) {
          console.log("Updating sameAs for DDB version");
          const sameAsId = spell.sameAs[0];
          await this.notionService.patchPage(sameAsId, { ...partialSameAs, sameAs: [spellId] });
        }
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
