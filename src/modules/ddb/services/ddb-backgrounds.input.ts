import consola from 'consola';
import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import { Background, ConfigService, EntityType, HtmlElementHelper, LabelsHelper, NewPageService } from '../../core';
import { DdbSearchableEntityInput, SearchType } from './ddb-searchable-entity.input';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbBackgroundsInput extends DdbSearchableEntityInput<Background> {
  protected searchType: SearchType = 'onePager';
  protected entityType: EntityType = 'Background';
  protected searchPagePath: string = 'https://www.dndbeyond.com/backgrounds';
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

  protected async getEntityFromDetailPage(uri: string, page: HTMLElement): Promise<Background> {
    const content = page.querySelector('.primary-content');
    if (!content) {
      consola.error(uri);
      throw new Error('Failed to get feat content');
    }

    const item: Background = {
      uri,
      type: 'Background' as const,
      name: this.labelsHelper.getName(this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title'))!,
      textContent: content.outerHTML,
      tags: this.htmlElementHelper.getAllCleanedInnerText(page, '.tags .tag'),
      source: this.htmlElementHelper.getCleanedText(content.querySelector('.source-description')?.innerText.split(',')?.[0]),
      dataSource: 'ddb',
      lang: 'en',
    };

    return item;
  }
}
