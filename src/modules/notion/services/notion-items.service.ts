import { markdownToBlocks } from '@tryfabric/martian';
import { Injectable } from 'injection-js';

import { ConfigService, OldItem } from '../../core';
import { ItemProperties } from '../models/item-properties';
import { NotionDbService, PropertiesSchema } from './notion-db.service';
import { NotionHelper } from './notion.helper';

@Injectable()
export class NotionItemsService extends NotionDbService<OldItem> {
  constructor(configService: ConfigService, notionHelper: NotionHelper) {
    super(configService, notionHelper);
  }

  getDatabaseId(): string {
    return this.configService.config.notion?.itemsDbId ?? '';
  }

  protected getProperties(item: OldItem): any {
    return {
      ...this.notionHelper.getTitle(ItemProperties.NAME, item.name),
      ...this.notionHelper.getMultiSelect(ItemProperties.TAGS, item.tags),
      ...this.notionHelper.getSelect(ItemProperties.DATA_SOURCE, item.dataSource),
      ...this.notionHelper.getSelect(ItemProperties.LANG, item.lang),
      ...this.notionHelper.getUrl(ItemProperties.URI, item.uri),
    };
  }

  protected getIcon(spell: OldItem) {
    return undefined;
  }

  protected getCover(spell: OldItem) {
    return undefined;
  }

  protected getChildren(item: OldItem): ReturnType<typeof markdownToBlocks> {
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

  protected getTitle(page: OldItem): string {
    return page.name!;
  }
}
