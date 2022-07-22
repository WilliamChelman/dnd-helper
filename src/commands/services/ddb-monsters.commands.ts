import { Injectable } from "injection-js";

import { DdbMonstersService } from "../../ddb";
import { NotionMonstersService } from "../../notion";
import { Command } from "../models";

@Injectable()
export class DdbMonstersCommands implements Command<void> {
  constructor(private ddbMonstersService: DdbMonstersService, private notionService: NotionMonstersService) {}

  async run(): Promise<void> {
    try {
      await this.notionService.initSchema();
      const monsters = await this.ddbMonstersService.getPartialMonsters();
      let index = 0;
      for (let monster of monsters) {
        console.group(`Processing ${index}/${monsters.length - 1} - ${monster.name}`);
        console.time("Took");
        monster = await this.ddbMonstersService.completeMonsterWithDetailPage(monster);
        await this.notionService.addPage(monster);
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
