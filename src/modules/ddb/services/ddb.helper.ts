import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';
import ufo from 'ufo';

import { ConfigService, EntityType, NewPageService, NewPageServiceOptions, PageCookies } from '../../core';
import { DdbMetaSource } from '../models';

@Injectable()
export class DdbHelper {
  readonly basePath = 'https://www.dndbeyond.com';
  readonly basePathMatching = /(https\:)?\/\/www\.dndbeyond\.com/;

  private uriBlacklist: (string | RegExp)[] = [
    'https://www.dndbeyond.com/backgrounds/criminal', // should be https://www.dndbeyond.com/backgrounds/criminal-spy
    'https://www.dndbeyond.com/backgrounds/folkhero',
    'https://www.dndbeyond.com/legacy',
    'https://www.dndbeyond.com/monsters/succubus-incubus',
    'https://www.dndbeyond.com/sources/cos/appendices',
    'https://www.dndbeyond.com/sources/cos/the-town-of-vallaki data-content-chunk-id=',
    'https://www.dndbeyond.com/sources/cotn/magic-itemsmedalofmuscle',
    'https://www.dndbeyond.com/sources/cotn/magic-itemsMedalofMuscle',
    'https://www.dndbeyond.com/sources/it/phb',
    'https://www.dndbeyond.com/sources/oga/one-grunge-above', // should be 'https://www.dndbeyond.com/sources/oga/one-grung-above'
    'https://www.dndbeyond.com/sources/one-dnd',
    /\/basic-rules\/monster-stat-blocks-.*$/,
    /\/sources\/tftyp\/a\d$/,
  ];

  constructor(private configService: ConfigService, private pageService: NewPageService) {}

  isUriBlacklisted(uri: string): boolean {
    return this.uriBlacklist.some(bl => (typeof bl === 'string' ? bl === uri : uri.match(bl)));
  }

  async crawlSearchPages<T>(
    path: string,
    parser: (page: HTMLElement, currentPageUrl: string) => T[],
    options: NewPageServiceOptions
  ): Promise<T[]> {
    const items = [];

    let nextPageUrl = await this.getBaseSearchPage(path);
    while (true) {
      const listPage = await this.pageService.getPageHtmlElement(nextPageUrl, options);
      items.push(...parser(listPage, nextPageUrl));
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

    let pageUrl = path;

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
      .map(option => ({ label: option.innerText.trim(), id: option.getAttribute('value')! }))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }

  getDefaultPageServiceOptions(): NewPageServiceOptions {
    return {
      cookies: this.getCookies(),
      headless: false,
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
    if (pathname.match(/^\/races\//)) return 'Species';

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
