import { Injectable } from 'injection-js';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { HTMLElement } from 'node-html-parser';

import { Entity, EntityDao, HtmlElementHelper, LabelsHelper, PageService, PageServiceFactory, Source, Spell } from '../../core';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbSourcesDao implements EntityDao<Source> {
  id: string = 'ddb-sources';

  private pageService: PageService;
  private blacklist: string[] = ['https://www.dndbeyond.com/sources/one-dnd', 'https://www.dndbeyond.com/sources/it/phb'];

  constructor(
    pageServiceFactory: PageServiceFactory,
    private htmlElementHelper: HtmlElementHelper,
    private ddbHelper: DdbHelper,
    private labelsHelper: LabelsHelper
  ) {
    this.pageService = pageServiceFactory.create({ ...this.ddbHelper.getDefaultPageServiceOptions() });
  }

  async getAll(): Promise<Source[]> {
    return await this.getSources();
  }

  async getByUri(uri: string): Promise<Spell> {
    throw new Error('not implemented');
  }

  async save(entity: Spell): Promise<string> {
    throw new Error('not implemented');
  }

  async patch(entity: Spell): Promise<string> {
    throw new Error('not implemented');
  }

  canHandle(entityType: string): number {
    throw new Error('not implemented');
  }

  private async getSources(): Promise<Source[]> {
    const sources: Source[] = [];
    const pageUrl = new URL('/sources', this.ddbHelper.basePath).toString();
    const listPage = await this.pageService.getPageHtmlElement(pageUrl);
    const uris = listPage.querySelectorAll('.sources-listing--item').map(anchor => this.getLink(anchor));

    let index = 0;
    for (const uri of uris) {
      ++index;
      console.info(`Parsing (${index}/${uris.length})`, uri);
      if (this.blacklist.includes(uri)) continue;
      sources.push(await this.getSource(uri));
    }

    return sources;
  }

  private async getSource(url: string): Promise<Source> {
    const page = await this.pageService.getPageHtmlElement(url);
    let content = page.querySelector('.compendium-toc-full-text');
    if (!content) {
      const singlePageSource = await this.getSubPage(url);
      if (!singlePageSource) {
        console.log(url);
        throw new Error('Failed to get source content');
      }
      singlePageSource.entityType = 'Source';
      return singlePageSource;
    }

    const pages: Entity[] = [];

    const subUris = content
      .querySelectorAll('a')
      .map(anchor => this.getLink(anchor))
      .filter(link => !link.includes('#'))
      .filter(link => !link.endsWith('.jpg'))
      .filter(link => !link.endsWith('.png'))
      .filter(link => !this.blacklist.includes(link));

    for (const subUri of subUris) {
      pages.push(await this.getSubPage(subUri));
    }

    this.ddbHelper.fixForMarkdown(content);

    const source: Source = {
      uri: url,
      entityType: 'Source' as const,
      id: url.split('/').pop()!,
      name: this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title')!,
      markdownContent: NodeHtmlMarkdown.translate(content.outerHTML, { blockElements: ['br'] }),
      htmlContent: content.outerHTML,
      dataSource: 'DDB',
      lang: 'EN',
      pages,
    };

    return source;
  }

  getLink(el: HTMLElement): string {
    return new URL(el.getAttribute('href')!, this.ddbHelper.basePath).toString();
  }

  private async getSubPage(url: string): Promise<Entity> {
    const page = await this.pageService.getPageHtmlElement(url);

    const content = page.querySelector('.p-article-content');
    if (!content) {
      console.log(url);
      throw new Error('Failed to get source content');
    }

    content.querySelector('.nav-select')?.remove();
    this.ddbHelper.fixForMarkdown(page);

    const subPage: Entity = {
      uri: url,
      entityType: 'SourcePage' as const,
      id: url.split('/').pop()!,
      name: this.htmlElementHelper.getCleanedInnerText(content, 'h1')!,
      markdownContent: NodeHtmlMarkdown.translate(content.outerHTML, { blockElements: ['br'] }),
      htmlContent: content.outerHTML,
      dataSource: 'DDB',
      lang: 'EN',
    };

    return subPage;
  }
}
