import { Injectable } from "injection-js";

import { AideDdMonstersService } from "../../aidedd";
import { Monster } from "../../core";
import { NotionMonstersService } from "../../notion";
import { Command } from "../models";

@Injectable()
export class AideDdMonstersCommands implements Command<void> {
  constructor(private notionService: NotionMonstersService, private aideDd: AideDdMonstersService) {}

  async run(): Promise<void> {
    try {
      await this.notionService.initSchema();
      const monsters = await this.aideDd.getPartialMonsters();
      let index = 0;
      for (let monster of monsters.slice(index)) {
        console.group(`Processing ${index}/${monsters.length - 1} - ${monster.name}`);
        console.time("Took");
        monster = await this.aideDd.completeMonsterWithDetailPage(monster);
        let partialSameAs: Monster | undefined = undefined;
        const names = [monster.name, ...(monster.altNames ?? [])];
        for (const altName of names) {
          let searchName = altName;
          if (monster.isLegacy) {
            searchName += " (Legacy)";
          }
          partialSameAs = { name: searchName, dataSource: "DDB" };
          const sameAs = await this.notionService.getCurrentId(partialSameAs);
          if (sameAs) {
            monster.altNames = monster.altNames?.filter((n) => n !== altName);
            monster.sameAs = [sameAs];
            const sameAsData = await this.notionService.getPageAndData(sameAs);
            monster.coverLink = (sameAsData.page as any).cover?.external.url;
            monster.iconLink = (sameAsData.page as any).icon?.external.url;
            break;
          }
        }
        const monsterId = await this.notionService.addPage(monster);
        if (monster.sameAs && partialSameAs) {
          console.log("Updating sameAs for DDB version");
          const sameAsId = monster.sameAs[0];
          await this.notionService.patchPage(sameAsId, { ...partialSameAs, sameAs: [monsterId] });
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
