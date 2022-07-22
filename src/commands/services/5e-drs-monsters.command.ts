import { Injectable } from "injection-js";

import { DrsMonstersService } from "../../5e-drs";
import { Monster } from "../../core";
import { MonsterProperties, NotionMonstersService } from "../../notion";
import { Command } from "../models";

@Injectable()
export class DrsMonstersCommand implements Command<void> {
  constructor(private notionService: NotionMonstersService, private drsMonstersService: DrsMonstersService) {}

  async run(): Promise<void> {
    try {
      await this.notionService.initSchema();
      const monsters = await this.drsMonstersService.getPartialMonsters();
      let index = 0;
      for (let monster of monsters) {
        console.group(`Processing ${index}/${monsters.length - 1} - ${monster.name}`);
        console.time("Took");
        if (await this.alreadyExistsFromOtherSource(monster)) {
          console.log("Already imported from elsewhere, skipping");
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

  private async alreadyExistsFromOtherSource(monster: Monster): Promise<boolean> {
    const response = await this.notionService.notion.databases.query({
      database_id: this.notionService.getDatabaseId(),
      page_size: 1,
      filter: {
        and: [
          { property: MonsterProperties.LINK, url: { does_not_equal: monster.link! } },
          {
            or: [
              {
                property: MonsterProperties.NAME,
                rich_text: { equals: monster.name! },
              },
              {
                property: MonsterProperties.ALT_NAMES,
                rich_text: { contains: monster.name! },
              },
            ],
          },
        ],
      },
    });

    return response.results.length > 0;
  }
}
