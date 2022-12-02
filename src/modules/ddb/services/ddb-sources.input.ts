import consola from 'consola';
import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import { ConfigService, HtmlElementHelper, InputService, PageService, PageServiceFactory, Source, SourcePage } from '../../core';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbSourcesInput implements InputService<Source> {
  sourceId: string = 'DDB';

  private pageService: PageService;
  private blacklist: string[] = ['https://www.dndbeyond.com/sources/one-dnd', 'https://www.dndbeyond.com/sources/it/phb'];

  constructor(
    pageServiceFactory: PageServiceFactory,
    private htmlElementHelper: HtmlElementHelper,
    private ddbHelper: DdbHelper,
    private configService: ConfigService
  ) {
    this.pageService = pageServiceFactory.create({ ...this.ddbHelper.getDefaultPageServiceOptions() });
  }

  async *getAll(): AsyncGenerator<Source> {
    let pageUrl = new URL('/sources', this.ddbHelper.basePath).toString();
    const name = this.configService.config.ddb?.name?.toLowerCase();
    const listPage = await this.pageService.getPageHtmlElement(pageUrl);
    const uris = listPage
      .querySelectorAll('.sources-listing--item')
      .filter(anchor => {
        if (!name) return true;
        return anchor.innerText.toLowerCase().includes(name);
      })
      .map(anchor => this.getLink(anchor));

    let index = 0;
    for (const uri of uris) {
      ++index;
      if (this.blacklist.includes(uri)) continue;
      consola.log(`Parsing (${index}/${uris.length})`, uri);
      yield await this.getSource(uri);
    }
  }

  canHandle(entityType: string): number | undefined {
    return entityType === 'Source' ? 10 : undefined;
  }

  private async getSource(url: string): Promise<Source> {
    const page = await this.pageService.getPageHtmlElement(url);
    const toc = page.querySelector('.compendium-toc-full-text');
    let content = page.querySelector('.compendium-toc-full-text');
    if (toc) {
      content = page.querySelector('.container');
    }
    if (!content) {
      const singlePageSource = { ...(await this.getSubPage(url)), type: 'Source' as const };
      if (!singlePageSource) {
        console.log(url);
        throw new Error('Failed to get source content');
      }
      return singlePageSource;
    }

    const pages: SourcePage[] = [];

    const subUris = toc
      ?.querySelectorAll('a')
      .map(anchor => this.getLink(anchor))
      .filter(link => !link.includes('#'))
      .filter(link => !link.endsWith('.jpg'))
      .filter(link => !link.endsWith('.png'))
      .filter(link => !this.blacklist.includes(link));

    for (const subUri of subUris ?? []) {
      pages.push(await this.getSubPage(subUri));
    }

    const source: Source = {
      uri: url,
      type: 'Source' as const,
      name: this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title')!,
      textContent: content.outerHTML,
      dataSource: 'DDB',
      lang: 'EN',
      pages,
    };

    return source;
  }

  getLink(el: HTMLElement): string {
    return new URL(el.getAttribute('href')!, this.ddbHelper.basePath).toString();
  }

  private async getSubPage(url: string): Promise<SourcePage> {
    const page = await this.pageService.getPageHtmlElement(url);

    const content = page.querySelector('article.p-article');
    if (!content) {
      console.log(url);
      throw new Error('Failed to get source content');
    }

    content.querySelector('.nav-select')?.remove();

    const subPage: SourcePage = {
      uri: url,
      type: 'SourcePage' as const,
      name: this.htmlElementHelper.getCleanedInnerText(content, 'h1')!,
      textContent: content.outerHTML,
      dataSource: 'DDB',
      lang: 'EN',
    };

    return subPage;
  }
}
