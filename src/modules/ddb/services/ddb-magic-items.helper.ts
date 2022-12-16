import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';
import { uniq } from 'lodash';
import { DdbLinkHelper } from './ddb-link.helper';
import { HtmlElementHelper } from '../../core';

@Injectable()
export class DdbMagicItemsHelper {
  readonly detailsSelector = '.item-info .details';

  constructor(private htmlElementHelper: HtmlElementHelper) {}

  getDetailsInfo(content: HTMLElement): { type: string; subtype?: string; rarity: string; attunement?: string } {
    const details = this.htmlElementHelper.getCleanedInnerText(content, '.item-info .details');
    const firstParenthesis = details.indexOf(')');
    let separatingComma = details.indexOf(',', firstParenthesis > 0 ? firstParenthesis : undefined);
    if (separatingComma < 0) {
      separatingComma = details.indexOf(',');
    }
    const typePart = details.slice(0, separatingComma);
    const metaPart = details.slice(separatingComma + 1);
    const [type, subtype] = this.getDetailsParts(typePart);
    const [rarity, attunement] = this.getDetailsParts(metaPart);

    return { type, subtype, rarity, attunement };
  }

  private getDetailsParts(text: string): [string, string | undefined] {
    const index = text.indexOf('(');
    if (index < 0) return [text, undefined];
    return [
      this.htmlElementHelper.getCleanedText(text.slice(0, index)),
      this.htmlElementHelper.getCleanedText(text.slice(index).replace(/[\(\)]/g, '')),
    ];
  }
}
