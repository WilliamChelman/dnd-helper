import consola from 'consola';
import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import {
  ClassType,
  ConfigService,
  EntityType,
  HtmlElementHelper,
  LabelsHelper,
  MagicItem,
  Many,
  manyToArray,
  NewPageService,
} from '../../core';
import { DdbLinkHelper } from './ddb-link.helper';
import { DdbMagicItemsHelper } from './ddb-magic-items.helper';
import { DdbSearchableEntityInput } from './ddb-searchable-entity.input';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbMagicItemsInput extends DdbSearchableEntityInput<MagicItem> {
  protected entityType: EntityType = 'MagicItem';
  protected searchPagePath: string = 'https://www.dndbeyond.com/magic-items';
  protected linkSelector: string = 'ul.rpgmagic-item-listing > div a';

  constructor(
    pageService: NewPageService,
    htmlElementHelper: HtmlElementHelper,
    ddbHelper: DdbHelper,
    labelsHelper: LabelsHelper,
    configService: ConfigService,
    private linkHelper: DdbLinkHelper,
    private ddbMagicItemsHelper: DdbMagicItemsHelper
  ) {
    super(pageService, htmlElementHelper, ddbHelper, labelsHelper, configService);
  }

  protected async getEntityFromDetailPage(uri: string, page: HTMLElement, uris: string[], depth: number = 0): Promise<Many<MagicItem>> {
    const content = page.querySelector('.more-info');
    if (!content) {
      consola.error(uri);
      throw new Error('Failed to get magic item content');
    }

    const { type, subtype, rarity, attunement } = this.ddbMagicItemsHelper.getDetailsInfo(content);

    const tags = this.htmlElementHelper.getAllCleanedInnerText(page, '.item-tag');

    const items: MagicItem[] = [];
    items.push({
      uri,
      type: 'MagicItem' as const,
      name: this.labelsHelper.getName(this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title'))!,
      tags,
      magicItemType: type,
      magicItemSubType: subtype,
      rarity,
      attunement: attunement?.includes('requires attunement'),
      textContent: content.outerHTML,
      isVariant: depth > 0,
      classes: Object.values(ClassType)
        .filter(className => attunement?.toLowerCase()?.includes(className.toLowerCase()))
        .sort(),
      dataSource: 'ddb',
      lang: 'en',
    });

    for (const anchor of content.querySelectorAll('a[href]')) {
      const variantUri = this.linkHelper.getAbsoluteUrl(anchor.getAttribute('href')!, uri);
      if (!variantUri.startsWith('https://www.dndbeyond.com/magic-items/') || uris.includes(variantUri)) continue;
      const variantPage = await this.pageService.getPageHtmlElement(variantUri, this.ddbHelper.getDefaultPageServiceOptions());
      items.push(...manyToArray(await this.getEntityFromDetailPage(variantUri, variantPage, [...uris, variantUri], depth + 1)));
    }

    return items;
  }
}
