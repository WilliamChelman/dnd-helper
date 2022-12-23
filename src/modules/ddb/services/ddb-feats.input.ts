import consola from 'consola';
import { Injectable, Injector } from 'injection-js';

import { AbilityScores, EntityType, Feat } from '../../core';
import { DdbSearchableEntityInput, SearchType } from './ddb-searchable-entity.input';

@Injectable()
export class DdbFeatsInput extends DdbSearchableEntityInput<Feat> {
  protected entityType: EntityType = 'Feat';
  protected searchPagePath: string = 'https://www.dndbeyond.com/feats';
  protected searchType: SearchType = 'onePager';
  protected linkSelector: string = 'ul.listing .list-row-name-primary a';

  constructor(injector: Injector) {
    super(injector);
  }

  protected async getEntityFromDetailPage(uri: string): Promise<Feat> {
    const page = await this.pageService.getPageHtmlElement(uri, this.ddbHelper.getDefaultPageServiceOptions());
    const content = page.querySelector('.primary-content');
    if (!content) {
      consola.error(uri);
      throw new Error('Failed to get feat content');
    }

    const item: Feat = {
      uri,
      type: 'Feat' as const,
      name: this.labelsHelper.getName(this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title'))!,
      textContent: content.outerHTML,
      tags: this.htmlElementHelper.getAllCleanedInnerText(page, '.tags .tag'),
      halfFeat: Object.keys(AbilityScores).filter(label => {
        const regexp = new RegExp(`increase.*${label.toLowerCase()}`, 'i');
        return content.innerText.toLowerCase().match(regexp);
      }),
      source: this.htmlElementHelper.getCleanedText(content.querySelector('.source-description')?.innerText.split(',')?.[0]),
      dataSource: 'ddb',
      lang: 'en',
    };

    return item;
  }
}
