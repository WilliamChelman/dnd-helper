import consola from 'consola';
import { memoize } from 'lodash';
import { Injectable, Injector } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import { DataSource, EntityType, Many, manyToArray, Source, SourcePage } from '../../core';
import { DdbSearchableEntityInput, SearchType } from './ddb-searchable-entity.input';
import { DdbSourcesHelper } from './ddb-sources.helper';

@Injectable()
export class DdbSourcesInput extends DdbSearchableEntityInput<Source | SourcePage> {
  sourceId: DataSource = 'ddb';

  protected searchType: SearchType = 'onePager';
  protected entityType: EntityType[] = ['Source', 'SourcePage'];
  protected searchPagePath: string = 'https://www.dndbeyond.com/sources';
  protected linkSelector: string = '.sources-listing--item';

  constructor(injector: Injector, private ddbSourcesHelper: DdbSourcesHelper) {
    super(injector);
    this.getEntityFromDetailPage = memoize(this.getEntityFromDetailPage.bind(this));
  }

  protected async getEntityFromDetailPage(uri: string): Promise<Many<Source | SourcePage>> {
    const page = await this.pageService.getPageHtmlElement(uri, this.ddbHelper.getDefaultPageServiceOptions());

    const type = await this.getType(uri, page);
    if (type === 'SourcePage') {
      return this.getSubPage(uri);
    }
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

    const items: (Source | SourcePage)[] = [];

    const subUris: string[] = this.ddbSourcesHelper.getSourcePageUrisFromSource(uri, page);
    if (this.configService.config.ddb?.includeSourcePages) {
      for (const subUri of subUris ?? []) {
        items.push(...manyToArray(await this.getEntityFromDetailPage(subUri)));
      }
    }

    const source: Source = {
      uri,
      type: 'Source' as const,
      name: this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title')!,
      textContent: content.outerHTML,
      dataSource: 'ddb',
      lang: 'en',
      pagesUris: subUris,
    };
    items.push(source);
    return items;
  }

  private async getType(uri: string, page: HTMLElement): Promise<'Source' | 'SourcePage'> {
    if (uri.match(/\/sources\/[\w|-]+$/)) return 'Source';
    const breadcrumbs = page.querySelectorAll('.b-breadcrumb.b-breadcrumb-a a').map(anchor => anchor.innerText.trim().toLowerCase());

    if (breadcrumbs.length === 3) {
      // most likely ToC page
      return 'Source';
    }

    return 'SourcePage';
  }

  private async getSubPage(uri: string): Promise<SourcePage> {
    const page = await this.pageService.getPageHtmlElement(uri, this.ddbHelper.getDefaultPageServiceOptions());

    const content = page.querySelector('article.p-article');
    if (!content) {
      consola.error(uri);
      throw new Error('Failed to get source page content');
    }

    const breadcrumbs = page.querySelectorAll('.b-breadcrumb.b-breadcrumb-a a');
    let sourceUri = breadcrumbs[2]?.getAttribute('href')!;
    if (sourceUri) {
      sourceUri = this.ddbLinkHelper.getAbsoluteUrl(sourceUri, uri);
    }

    content.querySelector('.nav-select')?.remove();

    const subPage: SourcePage = {
      uri: uri,
      type: 'SourcePage' as const,
      name: this.htmlElementHelper.getCleanedInnerText(content, 'h1')!,
      sourceUri,
      textContent: content.outerHTML,
      dataSource: 'ddb',
      lang: 'en',
    };

    return subPage;
  }
}
