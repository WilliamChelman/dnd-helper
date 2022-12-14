import consola from 'consola';
import { Injectable } from 'injection-js';
import { kebabCase } from 'lodash';

import { ConfigService, DataSource, HtmlElementHelper, InputService, NewPageService, PlayerClass, PlayerSubclass } from '../../core';
import { DdbLinkHelper } from './ddb-link.helper';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbPlayerClassesInput implements InputService<PlayerClass> {
  sourceId: DataSource = 'DDB';

  private blacklist: string[] = [];

  constructor(
    private pageService: NewPageService,
    private htmlElementHelper: HtmlElementHelper,
    private ddbHelper: DdbHelper,
    private configService: ConfigService,
    private ddbLinkHelper: DdbLinkHelper
  ) {}

  async *getAll(): AsyncGenerator<PlayerClass> {
    let pageUrl = new URL('/classes', this.ddbHelper.basePath).toString();
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
      yield await this.getPlayerClass(uri);
    }
  }

  canHandle(entityType: string): number | undefined {
    return entityType === 'Class' ? 10 : undefined;
  }

  private async getPlayerClass(url: string): Promise<PlayerClass> {
    const page = await this.pageService.getPageHtmlElement(url, this.ddbHelper.getDefaultPageServiceOptions());

    const content = page.querySelector('.content-container');

    const subclasses: PlayerSubclass[] = [];

    const subUris = content
      ?.querySelectorAll('.subitems-list-details h2[id]')
      .map(heading => `https://www.dndbeyond.com/subclasses/${kebabCase(heading.innerText.trim())}`);

    for (const subUri of subUris ?? []) {
      subclasses.push(await this.getSubclass(subUri));
    }

    const playerClass: PlayerClass = {
      uri: url,
      type: 'Class' as const,
      name: this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title')!,
      textContent: content?.outerHTML ?? '',
      dataSource: 'DDB',
      lang: 'EN',
      subclasses,
    };

    return playerClass;
  }

  private async getSubclass(url: string): Promise<PlayerSubclass> {
    const page = await this.pageService.getPageHtmlElement(url, this.ddbHelper.getDefaultPageServiceOptions());

    const content = page.querySelector('.container');
    if (!content) {
      consola.error(url);
      throw new Error('Failed to get subclass content');
    }

    const subPage: PlayerSubclass = {
      uri: url,
      type: 'Subclass' as const,
      name: this.htmlElementHelper.getCleanedInnerText(content, 'h1')!,
      textContent: content.outerHTML,
      dataSource: 'DDB',
      baseClass: this.htmlElementHelper.getCleanedInnerText(content, '.base-class-callout-link'),
      source: this.htmlElementHelper.getCleanedInnerText(content, '.source-description'),
      lang: 'EN',
    };

    return subPage;
  }
}
