import consola from 'consola';
import ufo from 'ufo';
import { Injectable, Injector } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import {
  ConfigService,
  DataSource,
  Entity,
  EntityType,
  HtmlElementHelper,
  InputService,
  LabelsHelper,
  Many,
  manyToArray,
  NewPageService,
  notNil,
} from '../../core';
import { DdbLinkHelper } from './ddb-link.helper';
import { DdbHelper } from './ddb.helper';

@Injectable()
export abstract class DdbSearchableEntityInput<T extends Entity> implements InputService<T> {
  sourceId: DataSource = 'ddb';
  protected searchType: SearchType = 'crawl';
  protected abstract entityType: Many<EntityType>;
  protected abstract searchPagePath: string;
  protected abstract linkSelector: string;

  protected pageService: NewPageService = this.injector.get(NewPageService);
  protected htmlElementHelper: HtmlElementHelper = this.injector.get(HtmlElementHelper);
  protected ddbHelper: DdbHelper = this.injector.get(DdbHelper);
  protected labelsHelper: LabelsHelper = this.injector.get(LabelsHelper);
  protected configService: ConfigService = this.injector.get(ConfigService);
  protected ddbLinkHelper: DdbLinkHelper = this.injector.get(DdbLinkHelper);

  constructor(protected injector: Injector) {}

  async *getAll(): AsyncGenerator<T> {
    const returnedUris = new Set<string>();
    let allUris: string[];
    if (this.searchType === 'crawl') {
      allUris = await this.ddbHelper.crawlSearchPages<string>(
        this.searchPagePath,
        this.getEntityUrisFromSearchPage.bind(this),
        this.ddbHelper.getDefaultPageServiceOptions()
      );
      allUris = Array.from(new Set(allUris)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    } else {
      const searchPage = await this.pageService.getPageHtmlElement(this.searchPagePath, this.ddbHelper.getDefaultPageServiceOptions());
      allUris = await this.getEntityUrisFromSearchPage(searchPage, this.searchPagePath);
    }

    let index = 0;
    let supplementalCount = 0;
    for (const uri of allUris) {
      ++index;
      consola.info(`Parsing (${index + supplementalCount}/${allUris.length + supplementalCount})`, uri);
      if (this.ddbHelper.isUriBlacklisted(uri)) {
        consola.info('skipping');
        continue;
      }

      const entities = manyToArray(await this.getEntityFromDetailPage(uri, allUris));
      supplementalCount += entities.length - 1;

      for (const entity of entities) {
        if (!returnedUris.has(entity.uri)) {
          returnedUris.add(entity.uri);
          yield entity;
        }
      }
    }
  }

  async getByUri(uri: string): Promise<T> {
    return manyToArray(await this.getEntityFromDetailPage(uri, [uri])).find(e => e.uri === uri)!;
  }

  canHandle(entityType: string): number | undefined {
    return manyToArray(this.entityType).includes(entityType as EntityType) ? 10 : undefined;
  }

  protected getEntityUrisFromSearchPage(page: HTMLElement, currentPageUrl: string): string[] {
    const name = this.configService.config.ddb?.name?.toLowerCase();
    const links = page.querySelectorAll(this.linkSelector);
    return links
      .map(link => {
        const href = link.getAttribute('href');
        if (href?.match(/\.[a-z]+$/)) return undefined;
        if (this.searchType === 'onePager' && name && !link.textContent.toLowerCase().includes(name)) return undefined;

        return this.ddbLinkHelper.getAbsoluteUrl(href!, currentPageUrl).split('?')[0];
      })
      .filter(notNil);
  }

  protected abstract getEntityFromDetailPage(uri: string, allUris: string[]): Promise<Many<T>>;
}

export type SearchType = 'crawl' | 'onePager';
