import consola from 'consola';
import { Injectable } from 'injection-js';

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
  private hasVariantBlacklist: string[] = ['https://www.dndbeyond.com/magic-items/351886-deck-of-several-things'];

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

  protected async getEntityFromDetailPage(uri: string, uris: string[], depth: number = 0): Promise<Many<MagicItem>> {
    const page = await this.pageService.getPageHtmlElement(uri, this.ddbHelper.getDefaultPageServiceOptions());

    const content = page.querySelector('.more-info');
    if (!content) {
      consola.error(uri);
      throw new Error('Failed to get magic item content');
    }

    const { type, subtype, rarity, attunement } = this.ddbMagicItemsHelper.getDetailsInfo(content);

    const tags = this.htmlElementHelper.getAllCleanedInnerText(page, '.item-tag');

    const items: MagicItem[] = [];
    const isLegacy = this.htmlElementHelper.getCleanedInnerText(page, '.page-heading .badge-label').toLowerCase().includes('legacy');
    let name = this.labelsHelper.getName(this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title'))!;
    if (isLegacy) {
      name += ' (Legacy)';
    }
    items.push({
      uri,
      type: 'MagicItem' as const,
      name,
      tags,
      magicItemType: type,
      magicItemSubType: subtype,
      rarity,
      attunement: attunement?.includes('requires attunement'),
      textContent: content.outerHTML,
      isVariant: depth > 0,
      isLegacy,
      classes: Object.values(ClassType)
        .filter(className => attunement?.toLowerCase()?.includes(className.toLowerCase()))
        .sort(),
      dataSource: 'ddb',
      lang: 'en',
    });

    const variantsAnchors = this.hasVariantBlacklist.includes(uri) ? [] : content.querySelectorAll('a[href]');
    for (const anchor of variantsAnchors) {
      const variantUri = this.linkHelper.getAbsoluteUrl(anchor.getAttribute('href')!, uri);
      if (!variantUri.startsWith('https://www.dndbeyond.com/magic-items/') || uris.includes(variantUri)) continue;
      const variantItems = manyToArray(await this.getEntityFromDetailPage(variantUri, [...uris, variantUri], depth + 1)).map(item => {
        return item.variantOf ? item : { ...item, variantOf: uri };
      });
      items.push(...variantItems);
    }

    return items;
  }
}
