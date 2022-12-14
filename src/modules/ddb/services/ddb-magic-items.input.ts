import consola from 'consola';
import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import { ClassType, EntityType, HtmlElementHelper, LabelsHelper, MagicItem, NewPageService } from '../../core';
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

    const details = this.htmlElementHelper.getCleanedInnerText(content, '.item-info .details');
    const firstParenthesis = details.indexOf(')');
    let separatingComma = details.indexOf(',', firstParenthesis > 0 ? firstParenthesis : undefined);
    if (separatingComma < 0) {
      separatingComma = details.indexOf(',');
    }
    const typePart = details.slice(0, separatingComma);
    const metaPart = details.slice(separatingComma + 1);
    const [type, subtype] = this.getParts(typePart);
    const [rarity, attunement] = this.getParts(metaPart);

    const magicItem: MagicItem = {
      uri,
      type: 'MagicItem' as const,
      name: this.labelsHelper.getName(this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title'))!,
      tags: this.htmlElementHelper.getAllCleanedInnerText(page, '.item-tag'),
      magicItemType: type,
      magicItemSubType: subtype,
      rarity,
      attunement: attunement?.includes('requires attunement'),
      textContent: content.outerHTML,
      classes: Object.values(ClassType)
        .filter(className => attunement?.toLowerCase()?.includes(className.toLowerCase()))
        .sort(),
      dataSource: 'DDB',
      lang: 'EN',
    };

    return magicItem;
  }

  private getParts(text: string): [string, string | undefined] {
    const index = text.indexOf('(');
    if (index < 0) return [text, undefined];
    return [
      this.htmlElementHelper.getCleanedText(text.slice(0, index)),
      this.htmlElementHelper.getCleanedText(text.slice(index).replace(/[\(\)]/g, '')),
    ];
  }
}
