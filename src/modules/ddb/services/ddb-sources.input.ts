import consola from 'consola';
import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import { ConfigService, DataSource, EntityType, HtmlElementHelper, LabelsHelper, NewPageService, Source, SourcePage } from '../../core';
import { DdbSearchableEntityInput, SearchType } from './ddb-searchable-entity.input';
import { DdbSourcesHelper } from './ddb-sources.helper';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbSourcesInput extends DdbSearchableEntityInput<Source> {
  sourceId: DataSource = 'ddb';

  protected searchType: SearchType = 'onePager';
  protected entityType: EntityType = 'Source';
  protected searchPagePath: string = 'https://www.dndbeyond.com/sources';
  protected linkSelector: string = '.sources-listing--item';
  protected uriBlacklist: string[] = ['https://www.dndbeyond.com/sources/one-dnd', 'https://www.dndbeyond.com/sources/it/phb'];

  constructor(
    pageService: NewPageService,
    htmlElementHelper: HtmlElementHelper,
    ddbHelper: DdbHelper,
    configService: ConfigService,
    labelsHelper: LabelsHelper,

    private ddbSourcesHelper: DdbSourcesHelper
  ) {
    super(pageService, htmlElementHelper, ddbHelper, labelsHelper, configService);
  }

  protected async getEntityFromDetailPage(uri: string, page: HTMLElement): Promise<Source> {
    const toc = page.querySelector('.compendium-toc-full-text');
    let content = page.querySelector('.compendium-toc-full-text');
    if (toc) {
      content = page.querySelector('.container');
    }
    if (!content) {
      const singlePageSource = { ...(await this.getSubPage(uri)), type: 'Source' as const };
      if (!singlePageSource) {
        consola.error(uri);
        throw new Error('Failed to get source content');
      }
      return singlePageSource;
    }

    const pages: SourcePage[] = [];
    if (this.configService.config.ddb?.includeSourcePages) {
      const subUris = this.ddbSourcesHelper.getSourcePageUrisFromSource(uri, page);

      for (const subUri of subUris ?? []) {
        pages.push(await this.getSubPage(subUri));
      }
    }

    const source: Source = {
      uri,
      type: 'Source' as const,
      name: this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title')!,
      textContent: content.outerHTML,
      dataSource: 'ddb',
      lang: 'en',
      pages,
    };

    return source;
  }

  private async getSubPage(url: string): Promise<SourcePage> {
    const page = await this.pageService.getPageHtmlElement(url, this.ddbHelper.getDefaultPageServiceOptions());

    const content = page.querySelector('article.p-article');
    if (!content) {
      consola.error(url);
      throw new Error('Failed to get source content');
    }

    content.querySelector('.nav-select')?.remove();

    const subPage: SourcePage = {
      uri: url,
      type: 'SourcePage' as const,
      name: this.htmlElementHelper.getCleanedInnerText(content, 'h1')!,
      textContent: content.outerHTML,
      dataSource: 'ddb',
      lang: 'en',
    };

    return subPage;
  }
}
