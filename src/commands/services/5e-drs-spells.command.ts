import { Injectable } from "injection-js";

import { DrsSpellsService } from "../../5e-drs/services/5e-drs-spells.service";
import { Spell } from "../../core";
import { NotionSpellsService, SpellProperties } from "../../notion";
import { Command } from "../models";

@Injectable()
export class DrsSpellsCommand implements Command<void> {
  constructor(private notionService: NotionSpellsService, private drsSpellsService: DrsSpellsService) {}

  async run(): Promise<void> {
    try {
      await this.notionService.initSchema();
      const spells = await this.drsSpellsService.getPartialSpells();
      let index = 0;
      for (let spell of spells) {
        console.group(`Processing ${index}/${spells.length - 1} - ${spell.name}`);
        console.time("Took");
        if (await this.alreadyExistsFromOtherSource(spell)) {
          console.log("Already imported from elsewhere, skipping");
        } else {
          spell = await this.drsSpellsService.completeSpellWithDetailPage(spell);
          await this.notionService.addPage(spell);
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

  private async alreadyExistsFromOtherSource(spell: Spell): Promise<boolean> {
    const response = await this.notionService.notion.databases.query({
      database_id: this.notionService.getDatabaseId(),
      page_size: 1,
      filter: {
        and: [
          { property: SpellProperties.URI, url: { does_not_equal: spell.uri } },
          {
            or: [
              {
                property: SpellProperties.NAME,
                rich_text: { equals: spell.name! },
              },
              {
                property: SpellProperties.ALT_NAMES,
                rich_text: { contains: spell.name! },
              },
            ],
          },
        ],
      },
    });

    return response.results.length > 0;
  }
}
