import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';
import ufo from 'ufo';

import { ConfigService, EntityType, NewPageService, NewPageServiceOptions, PageCookies } from '../../core';
import { DdbMetaSource } from '../models';

@Injectable()
export class DdbHelper {
  readonly basePath = 'https://www.dndbeyond.com';
  readonly basePathMatching = /(https\:)?\/\/www\.dndbeyond\.com/;

  constructor(private configService: ConfigService, private pageService: NewPageService) {}

  async crawlSearchPages<T>(path: string, parser: (page: HTMLElement) => T[], options: NewPageServiceOptions): Promise<T[]> {
    const items = [];
    let nextPageUrl = await this.getBaseSearchPage(path);
    while (true) {
      const listPage = await this.pageService.getPageHtmlElement(nextPageUrl, options);
      items.push(...parser(listPage));
      const nextHref = listPage.querySelector('.b-pagination-item-next a')?.getAttribute('href');
      if (nextHref) {
        nextPageUrl = new URL(nextHref, nextPageUrl).toString();
      } else {
        break;
      }
    }

    return items;
  }

  private async getBaseSearchPage(path: string): Promise<string> {
    const { config } = this.configService;

    let pageUrl = ufo.resolveURL(this.basePath, path);

    if (config.ddb?.name) {
      pageUrl = ufo.withQuery(pageUrl, { 'filter-search': config.ddb?.name });
    }

    if (config.ddb?.sourceName) {
      const sources = (await this.getMetaSources())
        .filter(source => source.label.toLowerCase().includes(config.ddb?.sourceName ?? ''))
        .map(source => source.id);
      if (sources.length) {
        pageUrl = ufo.withQuery(pageUrl, { 'filter-source': sources });
      }
    }

    return pageUrl;
  }

  async getMetaSources(): Promise<DdbMetaSource[]> {
    const content = await this.pageService.getPageHtmlElement('https://www.dndbeyond.com/spells', {
      ...this.getDefaultPageServiceOptions(),
      noCache: false,
    });
    return content
      .querySelectorAll('#filter-source option')
      .map(option => ({ label: option.innerText.trim(), id: option.getAttribute('value')! }));
  }

  getDefaultPageServiceOptions(): NewPageServiceOptions {
    return {
      cookies: this.getCookies(),
      validator: async page => {
        return !page.querySelector('title')?.innerText.includes('Access to this page has been denied.');
      },
      cacheValidator: async el => {
        return !el.querySelector('.error-page-title');
      },
      cleaner: el => {
        el.querySelectorAll(
          'head,script,style,iframe,noscript,#mega-menu-target,header.main,.site-bar,.ddb-site-banner,#footer,.ad-container,.homebrew-comments'
        ).forEach(e => e.remove());
      },
    };
  }

  getType(uri: string): EntityType | undefined {
    if (!uri.startsWith(this.basePath)) return undefined;
    uri = uri.replace(/[#\?].*/, '');
    const { pathname } = ufo.parseURL(uri);
    if (pathname.startsWith('/magic-items/')) return 'MagicItem';
    if (pathname.startsWith('/spells/')) return 'Spell';
    if (pathname.startsWith('/monsters/')) return 'Monster';
    if (pathname.match(/^\/sources\/[\w-]+$/)) return 'Source';
    if (pathname.match(/^\/sources\//)) return 'SourcePage';
    if (pathname.match(/^\/equipment\//)) return 'Item';
    if (pathname.match(/^\/feats\//)) return 'Feat';
    if (pathname.match(/^\/backgrounds\//)) return 'Background';
    if (pathname.match(/^\/classes\//)) return 'Class';
    if (pathname.match(/^\/subclasses\//)) return 'Subclass';

    return undefined;
  }

  private getCookies(): PageCookies {
    return [
      {
        name: 'CobaltSession',
        httpOnly: true,
        secure: true,
        domain: '.dndbeyond.com',
        path: '/',
        value: this.configService.config.ddb?.cobaltSession ?? '',
      },
    ];
  }
}

export interface CrawlSearchResponse<T> {
  items: T[];
  nextPage?: string;
}
