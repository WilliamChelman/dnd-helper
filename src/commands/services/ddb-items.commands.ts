import { Injectable } from "injection-js";

import { DdbMonstersService } from "../../ddb";
import { DdbItemsService } from "../../ddb/services/ddb-items.service";
import { NotionItemsService, NotionMonstersService } from "../../notion";
import { Command } from "../models";

@Injectable()
export class DdbItemsCommands implements Command<void> {
  constructor(private ddbItemsService: DdbItemsService, private notionService: NotionItemsService) {}

  async run(): Promise<void> {
    try {
      await this.notionService.initSchema();
      const items = await this.ddbItemsService.getPartialItems();
      const types = Array.from(new Set(items.map((item) => item.type)));
      let index = 0;
      for (let item of items) {
        console.group(`Processing ${index}/${items.length - 1} - ${item.name}`);
        console.time("Took");
        item = await this.ddbItemsService.completeItemWithDetailPage(item);
        // await this.notionService.addPage(item);
        ++index;
        console.timeEnd("Took");
        console.groupEnd();
      }
      console.log("🚀 ~ DdbItemsCommands ~ items", types.sort());
    } catch (err) {
      console.error(err);
    } finally {
      console.log("DONE");
    }
  }
}
