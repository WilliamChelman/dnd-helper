import consola from 'consola';
import { Injectable } from 'injection-js';
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
import { DdbHelper } from './ddb.helper';

@Injectable()
export abstract class DdbSearchableEntityInput<T extends Entity> implements InputService<T> {
  sourceId: DataSource = 'ddb';
  protected searchType: SearchType = 'crawl';
  protected abstract entityType: EntityType;
  protected abstract searchPagePath: string;
  protected abstract linkSelector: string;
  protected uriBlacklist: string[] = ['https://www.dndbeyond.com/legacy'];

  constructor(
    protected pageService: NewPageService,
    protected htmlElementHelper: HtmlElementHelper,
    protected ddbHelper: DdbHelper,
    protected labelsHelper: LabelsHelper,
    protected configService: ConfigService
  ) {}

  async *getAll(): AsyncGenerator<T> {
    const returnedUris = new Set<string>();
    let allUris: string[];
    if (this.searchType === 'crawl') {
      allUris = await this.ddbHelper.crawlSearchPages<string>(
        this.searchPagePath,
        this.getEntityUrisFromSearchPage.bind(this),
        this.ddbHelper.getDefaultPageServiceOptions()
      );
    } else {
      const searchPage = await this.pageService.getPageHtmlElement(this.searchPagePath, this.ddbHelper.getDefaultPageServiceOptions());
      allUris = await this.getEntityUrisFromSearchPage(searchPage);
    }

    let index = 0;
    let supplementalCount = 0;
    for (const uri of allUris) {
      ++index;
      consola.info(`Parsing (${index + supplementalCount}/${allUris.length + supplementalCount})`, uri);
      if (this.uriBlacklist.includes(uri)) {
        consola.info('skipping');
        continue;
      }

      const page = await this.pageService.getPageHtmlElement(uri, this.ddbHelper.getDefaultPageServiceOptions());
      const entities = manyToArray(await this.getEntityFromDetailPage(uri, page, allUris));
      supplementalCount += entities.length - 1;

      for (const entity of entities) {
        if (!returnedUris.has(entity.uri)) {
          returnedUris.add(entity.uri);
          yield entity;
        }
      }
    }
  }

  canHandle(entityType: string): number | undefined {
    return entityType === this.entityType ? 10 : undefined;
  }

  protected getEntityUrisFromSearchPage(page: HTMLElement): string[] {
    const name = this.configService.config.ddb?.name?.toLowerCase();
    const links = page.querySelectorAll(this.linkSelector);
    return links
      .map(link => {
        const href = link.getAttribute('href');
        if (href?.match(/\.[a-z]+$/)) return undefined;
        if (this.searchType === 'onePager' && name && !link.textContent.toLowerCase().includes(name)) return undefined;
        return new URL(href!, this.ddbHelper.basePath).toString();
      })
      .filter(notNil);
  }

  protected abstract getEntityFromDetailPage(uri: string, page: HTMLElement, allUris: string[]): Promise<Many<T>>;
}

export type SearchType = 'crawl' | 'onePager';
