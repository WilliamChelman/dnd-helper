import consola from 'consola';
import { Injectable } from 'injection-js';

import { ConfigService, DataSource, HtmlElementHelper, InputService, NewPageService, Species } from '../../core';
import { DdbLinkHelper } from './ddb-link.helper';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbSpeciesInput implements InputService<Species> {
  sourceId: DataSource = 'DDB';

  private blacklist: string[] = [];

  constructor(
    private pageService: NewPageService,
    private htmlElementHelper: HtmlElementHelper,
    private ddbHelper: DdbHelper,
    private configService: ConfigService,
    private ddbLinkHelper: DdbLinkHelper
  ) {}

  async *getAll(): AsyncGenerator<Species> {
    let pageUrl = new URL('/races', this.ddbHelper.basePath).toString();
    const name = this.configService.config.ddb?.name?.toLowerCase();
    const listPage = await this.pageService.getPageHtmlElement(pageUrl, {
      ...this.ddbHelper.getDefaultPageServiceOptions(),
      noCache: false,
    });
    const uris = listPage
      .querySelectorAll('a.listing-card__link')
      .filter(anchor => {
        if (!name) return true;
        return anchor.querySelector('.listing-card__title')?.innerText.toLowerCase().includes(name);
      })
      .map(anchor => this.ddbLinkHelper.getAbsoluteUrl(anchor.getAttribute('href')!, pageUrl));

    let index = 0;
    for (const uri of uris) {
      ++index;
      if (this.blacklist.includes(uri)) continue;
      consola.log(`Parsing (${index}/${uris.length})`, uri);
      yield await this.getSpecies(uri);
    }
  }

  canHandle(entityType: string): number | undefined {
    return entityType === 'Species' ? 10 : undefined;
  }

  private async getSpecies(uri: string): Promise<Species> {
    const page = await this.pageService.getPageHtmlElement(uri, this.ddbHelper.getDefaultPageServiceOptions());

    const content = page.querySelector('.content-container');
    if (!content) throw new Error(`Failed to get species content ${uri}`);

    const isLegacy = !!this.htmlElementHelper.getCleanedText('h1 #legacy-badge');
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
      dataSource: 'DDB',
      lang: 'EN',
    };

    return species;
  }
}
