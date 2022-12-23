import consola from 'consola';
import { Injectable, Injector } from 'injection-js';

import { Background, EntityType } from '../../core';
import { DdbSearchableEntityInput, SearchType } from './ddb-searchable-entity.input';

@Injectable()
export class DdbBackgroundsInput extends DdbSearchableEntityInput<Background> {
  protected searchType: SearchType = 'onePager';
  protected entityType: EntityType = 'Background';
  protected searchPagePath: string = 'https://www.dndbeyond.com/backgrounds';
  protected linkSelector: string = 'ul.listing .list-row-name-primary a';

  constructor(injector: Injector) {
    super(injector);
  }

  protected async getEntityFromDetailPage(uri: string): Promise<Background> {
    const page = await this.pageService.getPageHtmlElement(uri, this.ddbHelper.getDefaultPageServiceOptions());
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
