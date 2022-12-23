import { Injectable, Injector } from 'injection-js';

import { EntityType, Species } from '../../core';
import { DdbSearchableEntityInput, SearchType } from './ddb-searchable-entity.input';

@Injectable()
export class DdbSpeciesInput extends DdbSearchableEntityInput<Species> {
  protected searchType: SearchType = 'onePager';
  protected entityType: EntityType = 'Species';
  protected searchPagePath: string = 'https://www.dndbeyond.com/races';
  protected linkSelector: string = 'a.listing-card__link';

  constructor(injector: Injector) {
    super(injector);
  }

  protected async getEntityFromDetailPage(uri: string): Promise<Species> {
    const page = await this.pageService.getPageHtmlElement(uri, this.ddbHelper.getDefaultPageServiceOptions());

    const content = page.querySelector('.content-container');
    if (!content) throw new Error(`Failed to get species content ${uri}`);

    const isLegacy = !!this.htmlElementHelper.getCleanedInnerText(content, 'h1 #legacy-badge');
    let name = this.htmlElementHelper.getCleanedInnerText(page, 'h1');
    if (isLegacy) {
      name += ` (Legacy)`;
    }
    const [source, sourceDetails] = this.htmlElementHelper
      .getCleanedInnerText(page, '.source-summary')
      .split(',')
      .map(p => this.htmlElementHelper.getCleanedText(p));

    const species: Species = {
      uri: uri,
      type: 'Species' as const,
      name,
      textContent: content?.outerHTML ?? '',
      isLegacy: isLegacy,
      source,
      sourceDetails,
      dataSource: 'ddb',
      lang: 'en',
    };

    return species;
  }
}
