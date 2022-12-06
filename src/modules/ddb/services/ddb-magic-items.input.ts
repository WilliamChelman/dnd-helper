import consola from 'consola';
import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import { EntityType, HtmlElementHelper, LabelsHelper, MagicItem, NewPageService } from '../../core';
import { DdbSearchableEntityInput } from './ddb-searchable-entity.input';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbMagicItemsInput extends DdbSearchableEntityInput<MagicItem> {
  protected entityType: EntityType = 'MagicItem';
  protected searchPagePath: string = 'magic-items';
  protected linkSelector: string = 'ul.rpgmagic-item-listing > div a';

  constructor(pageService: NewPageService, htmlElementHelper: HtmlElementHelper, ddbHelper: DdbHelper, labelsHelper: LabelsHelper) {
    super(pageService, htmlElementHelper, ddbHelper, labelsHelper);
  }

  protected async getEntityFromDetailPage(uri: string, page: HTMLElement): Promise<MagicItem> {
    const content = page.querySelector('.more-info');
    if (!content) {
      consola.error(uri);
      throw new Error('Failed to get magic item content');
    }

    const magicItem: MagicItem = {
      uri,
      type: 'MagicItem' as const,
      name: this.labelsHelper.getName(this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title'))!,
      textContent: content.outerHTML,
      dataSource: 'DDB',
      lang: 'EN',
    };

    return magicItem;
  }
}
