import consola from 'consola';
import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import { EntityType, HtmlElementHelper, Item, LabelsHelper, NewPageService } from '../../core';
import { DdbSearchableEntityInput } from './ddb-searchable-entity.input';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbItemsInput extends DdbSearchableEntityInput<Item> {
  protected entityType: EntityType = 'Item';
  protected searchPagePath: string = 'equipment';
  protected linkSelector: string = 'ul.listing .list-row-name-primary a';

  constructor(pageService: NewPageService, htmlElementHelper: HtmlElementHelper, ddbHelper: DdbHelper, labelsHelper: LabelsHelper) {
    super(pageService, htmlElementHelper, ddbHelper, labelsHelper);
  }

  protected async getEntityFromDetailPage(uri: string, page: HTMLElement): Promise<Item> {
    const content = page.querySelector('.primary-content');
    if (!content) {
      consola.error(uri);
      throw new Error('Failed to get item content');
    }

    const item: Item = {
      uri,
      type: 'Item' as const,
      name: this.labelsHelper.getName(this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title'))!,
      textContent: content.outerHTML,
      dataSource: 'DDB',
      lang: 'EN',
    };

    return item;
  }
}
