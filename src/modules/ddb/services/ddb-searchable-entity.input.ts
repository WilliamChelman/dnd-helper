import consola from 'consola';
import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import { DataSource, Entity, EntityType, HtmlElementHelper, InputService, LabelsHelper, NewPageService } from '../../core';
import { DdbHelper } from './ddb.helper';

@Injectable()
export abstract class DdbSearchableEntityInput<T extends Entity> implements InputService<T> {
  sourceId: DataSource = 'DDB';
  protected abstract entityType: EntityType;
  protected abstract searchPagePath: string;
  protected abstract linkSelector: string;
  protected uriBlacklist: string[] = ['https://www.dndbeyond.com/legacy'];

  constructor(
    protected pageService: NewPageService,
    protected htmlElementHelper: HtmlElementHelper,
    protected ddbHelper: DdbHelper,
    protected labelsHelper: LabelsHelper
  ) {}

  async *getAll(): AsyncGenerator<T> {
    const uris = await this.ddbHelper.crawlSearchPages<string>(
      this.searchPagePath,
      this.getEntityUrisFromSearchPage.bind(this),
      this.ddbHelper.getDefaultPageServiceOptions()
    );
    let index = 0;
    for (const uri of uris) {
      ++index;
      consola.info(`Parsing (${index}/${uris.length})`, uri);
      if (this.uriBlacklist.includes(uri)) {
        consola.info('skipping');
        continue;
      }
      // TODO include variants
      const page = await this.pageService.getPageHtmlElement(uri, this.ddbHelper.getDefaultPageServiceOptions());
      yield await this.getEntityFromDetailPage(uri, page);
    }
  }

  canHandle(entityType: string): number | undefined {
    return entityType === this.entityType ? 10 : undefined;
  }

  protected getEntityUrisFromSearchPage(page: HTMLElement): string[] {
    const links = page.querySelectorAll(this.linkSelector);
    return links
      .map(link => {
        const href = link.getAttribute('href');
        if (href?.match(/\.[a-z]+$/)) return undefined;
        return new URL(href!, this.ddbHelper.basePath).toString();
      })
      .filter(v => v != null) as string[];
  }

  protected abstract getEntityFromDetailPage(uri: string, page: HTMLElement): Promise<T>;
}
