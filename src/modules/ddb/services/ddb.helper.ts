import { Injectable } from 'injection-js';
import { HTMLElement, parse } from 'node-html-parser';
import { join } from 'path';
import { ConfigService, Cookies, notNil, PageService, PageServiceOptions } from '../../core';

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

  fixForMarkdown(page: HTMLElement): void {
    this.fixLinks(page);
    this.fixImages(page);
  }

  fixSimpleImages(content: HTMLElement): void {
    content.querySelectorAll('a img').forEach((img, index) => {
      if (index > 0) {
        img.parentNode.remove();
      } else {
        img.parentNode.replaceWith(img);
      }
    });
  }

  // TODO move to markdown logic
  fixLinks(page: HTMLElement): void {
    const vaultPath = this.configService.config.markdownYaml?.ddbVaultPath ?? '';
    page.querySelectorAll('a[href]').forEach(anchor => {
      let href = anchor.getAttribute('href');
      if (!href) return;
      href = href.replace(this.basePathMatching, '');
      if (!href?.startsWith('http')) {
        href = join(vaultPath, href);
      }

      anchor.setAttribute('href', href);
      const previousText = anchor.previousSibling?.textContent;
      if (previousText && !previousText.endsWith('(')) {
        const wrapper = parse(`<span> </span>${anchor.outerHTML}`);
        anchor.replaceWith(wrapper);
      }
    });
  }

  fixImages(page: HTMLElement): void {
    page.querySelectorAll('img[src]').forEach(img => {
      let src = img.getAttribute('src');
      if (!src) return;
      if (src.startsWith('//')) {
        src = 'https:' + src;
      }

      img.setAttribute('src', src);
    });
  }

  private getCookies(): Cookies {
    return [
      {
        name: 'CobaltSession',
        httpOnly: true,
        secure: true,
        domain: '.dndbeyond.com',
        path: '/',
        value: this.configService.config.ddb.cobaltSession,
      },
    ];
  }
}

export interface CrawlSearchResponse<T> {
  items: T[];
  nextPage?: string;
}
