import consola from 'consola';
import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import { AbilityScores, ConfigService, EntityType, Feat, HtmlElementHelper, LabelsHelper, NewPageService } from '../../core';
import { DdbSearchableEntityInput, SearchType } from './ddb-searchable-entity.input';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbFeatsInput extends DdbSearchableEntityInput<Feat> {
  protected entityType: EntityType = 'Feat';
  protected searchPagePath: string = 'https://www.dndbeyond.com/feats';
  protected searchType: SearchType = 'onePager';
  protected linkSelector: string = 'ul.listing .list-row-name-primary a';

  constructor(
    pageService: NewPageService,
    htmlElementHelper: HtmlElementHelper,
    ddbHelper: DdbHelper,
    labelsHelper: LabelsHelper,
    configService: ConfigService
  ) {
    super(pageService, htmlElementHelper, ddbHelper, labelsHelper, configService);
  }

  protected async getEntityFromDetailPage(uri: string, page: HTMLElement): Promise<Feat> {
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
