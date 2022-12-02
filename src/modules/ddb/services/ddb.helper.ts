import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import { ConfigService, Cookies, EntityType, PageService, PageServiceOptions } from '../../core';

@Injectable()
export class DdbHelper {
  readonly basePath = 'https://www.dndbeyond.com';
  readonly basePathMatching = /(https\:)?\/\/www\.dndbeyond\.com/;

  constructor(private configService: ConfigService) {}

  async crawlSearchPages<T>(firstPageUrl: string, parser: (page: HTMLElement) => T[], pageService: PageService): Promise<T[]> {
    const items = [];
    let nextPageUrl: string = firstPageUrl;
    while (true) {
      const listPage = await pageService.getPageHtmlElement(nextPageUrl);
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

  getDefaultPageServiceOptions(): PageServiceOptions {
    return {
      cookies: this.getCookies(),
      validator: async page => {
        return !(await page.innerText('title')).includes('Access to this page has been denied.');
      },
      cleaner: el => {
        el.querySelectorAll(
          'head,script,style,iframe,noscript,#mega-menu-target,header.main,.site-bar,.ddb-site-banner,#footer,.ad-container,.homebrew-comments'
        ).forEach(e => e.remove());
      },
    };
  }

  getType(uri: string): EntityType {
    if (uri.includes('/magic-items/')) return 'MagicItem';
    if (uri.includes('/spells/')) return 'Spell';
    if (uri.includes('/monsters/')) return 'Monster';
    if (uri.match(/\/sources\/[\w-]+$/)) return 'Source';

    return 'SourcePage';
  }

  private getCookies(): Cookies {
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
