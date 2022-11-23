import { markdownToBlocks } from '@tryfabric/martian';
import { Injectable } from 'injection-js';

import { ConfigService, Item } from '../../core';
import { ItemProperties } from '../models/item-properties';
import { NotionDbService, PropertiesSchema } from './notion-db.service';
import { NotionHelper } from './notion.helper';

@Injectable()
export class NotionItemsService extends NotionDbService<Item> {
  constructor(configService: ConfigService, notionHelper: NotionHelper) {
    super(configService, notionHelper);
  }

  getDatabaseId(): string {
    return this.configService.config.notion.itemsDbId;
  }

  protected getProperties(item: Item): any {
    return {
      ...this.notionHelper.getTitle(ItemProperties.NAME, item.name),
      ...this.notionHelper.getMultiSelect(ItemProperties.TAGS, item.tags),
      ...this.notionHelper.getSelect(ItemProperties.DATA_SOURCE, item.dataSource),
      ...this.notionHelper.getSelect(ItemProperties.LANG, item.lang),
      ...this.notionHelper.getUrl(ItemProperties.URI, item.uri),
    };
  }

  protected getIcon(spell: Item) {
    return undefined;
  }

  protected getCover(spell: Item) {
    return undefined;
  }

  protected getChildren(item: Item): ReturnType<typeof markdownToBlocks> {
    if (!item.markdownContent) return [];
    return markdownToBlocks(item.markdownContent);
  }

  protected getSchema(): PropertiesSchema {
    return {
      [ItemProperties.NAME]: { title: {} },
      [ItemProperties.DATA_SOURCE]: { select: {} },
      [ItemProperties.TAGS]: { multi_select: {} },
      [ItemProperties.SOURCE]: { select: {} },
      [ItemProperties.SOURCE_DETAILS]: { rich_text: {} },
      [ItemProperties.ID]: { rich_text: {} },
      [ItemProperties.URI]: { url: {} },
      [ItemProperties.SAME_AS]: { relation: { database_id: this.getDatabaseId(), single_property: {} } } as any,
      [ItemProperties.LANG]: { select: {} },
    };
  }

  protected getTitle(page: Item): string {
    return page.name!;
  }
}
