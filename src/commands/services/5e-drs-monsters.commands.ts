import { Injectable } from "injection-js";

import { DrsMonstersService } from "../../5e-drs";
import { Monster } from "../../core";
import { NotionMonstersService } from "../../notion";
import { Commands } from "../models";

@Injectable()
export class DrsMonstersCommands implements Commands<void> {
  constructor(private notionService: NotionMonstersService, private drsMonstersService: DrsMonstersService) {}

  async run(): Promise<void> {
    try {
      await this.notionService.initSchema();
      const monsters = await this.drsMonstersService.getPartialMonsters();
      let index = 0;
      for (let monster of monsters) {
        console.group(`Processing ${index}/${monsters.length - 1} - ${monster.name}`);
        console.time("Took");
        if (await this.alreadyExistsInAideDd(monster)) {
          console.log("Already imported from AideDd, skipping");
        } else {
          monster = await this.drsMonstersService.completeMonsterWithDetailPage(monster);
          await this.notionService.addPage(monster);
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

  private async alreadyExistsInAideDd(monster: Monster): Promise<boolean> {
    const response = await this.notionService.notion.databases.query({
      database_id: this.notionService.getDatabaseId(),
      page_size: 1,
      filter: {
        and: [
          { property: "Data Source", select: { equals: "AideDD" } },
          {
            or: [
              {
                property: "title",
                rich_text: { equals: monster.name },
              },
              {
                property: "Alt Names",
                rich_text: { contains: monster.name },
              },
            ],
          },
        ],
      },
    });

    return response.results.length > 0;
  }
}
