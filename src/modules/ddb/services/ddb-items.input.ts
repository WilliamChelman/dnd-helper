import consola from 'consola';
import { Injectable, Injector } from 'injection-js';

import { EntityType, Item } from '../../core';
import { DdbSearchableEntityInput } from './ddb-searchable-entity.input';

@Injectable()
export class DdbItemsInput extends DdbSearchableEntityInput<Item> {
  protected entityType: EntityType = 'Item';
  protected searchPagePath: string = 'https://www.dndbeyond.com/equipment';
  protected linkSelector: string = 'ul.listing .list-row-name-primary a';

  constructor(injector: Injector) {
    super(injector);
  }

  protected async getEntityFromDetailPage(uri: string): Promise<Item> {
    const page = await this.pageService.getPageHtmlElement(uri, this.ddbHelper.getDefaultPageServiceOptions());
    const content = page.querySelector('.primary-content');
    if (!content) {
      consola.error(uri);
      throw new Error('Failed to get item content');
    }
    const description = this.htmlElementHelper.getCleanedInnerText(content, '.details-container-content-description-text');
    const matches = description.match(/Type: (.*) Cost: (.*) Weight: (.*)/);
    const item: Item = {
      uri,
      type: 'Item' as const,
      itemType: matches?.[1],
      cost: matches?.[2],
      weight: matches?.[3],
      name: this.labelsHelper.getName(this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title'))!,
      tags: this.htmlElementHelper.getAllCleanedInnerText(page, '.tags .tag'),
      textContent: content.outerHTML,
      source: this.htmlElementHelper.getCleanedInnerText(content, '.source-description'),
      dataSource: 'ddb',
      lang: 'en',
    };

    return item;
  }
}
