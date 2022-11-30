import { Injectable } from 'injection-js';
import { HTMLElement, parse } from 'node-html-parser';
import { join } from 'path';
import { ConfigService, Cookies, notNil, PageService, PageServiceOptions } from '../../core';

@Injectable()
export class DdbMdHelper {
  readonly basePath = 'https://www.dndbeyond.com';
  readonly basePathMatching = /(https\:)?\/\/www\.dndbeyond\.com/;

  constructor(private configService: ConfigService) {}

  fixSimpleImages(content: HTMLElement): void {
    content.querySelectorAll('a img').forEach((img, index) => {
      if (index > 0) {
        img.parentNode.remove();
      } else {
        img.parentNode.replaceWith(img);
      }
    });
  }

  fixLinks(page: HTMLElement, currentPageUrl: string): void {
    const vaultPath = this.configService.config.markdownYaml?.ddbVaultPath;
    if (!vaultPath) return;
    page.querySelectorAll('a').forEach(anchor => {
      if (!anchor.text.trim()) {
        anchor.remove();
        return;
      }

      let href = anchor.getAttribute('href');
      if (href) {
        href = this.urlToMdUrl(href, currentPageUrl);
        href = href.replace(/#.+/, `#${encodeURIComponent(anchor.textContent.trim())}`);
        anchor.setAttribute('href', href);
      }

      const previousText = anchor.previousSibling?.textContent;
      if (!previousText || previousText.trim().match(/\w$/)) {
        const wrapper = parse(`<span> </span>${anchor.outerHTML}`);
        anchor.replaceWith(wrapper);
      }
    });
  }

  urlToMdUrl(url: string, currentPageUrl: string): string {
    const vaultPath = this.configService.config.markdownYaml?.ddbVaultPath;
    if (!vaultPath) return url;

    url = url.replace(this.basePathMatching, '');
    if (url.startsWith('#')) {
      url = join(this.urlToMdUrl(currentPageUrl, currentPageUrl), url).replace('/#', '#');
    } else if (url.startsWith('./')) {
      url = join(this.urlToMdUrl(currentPageUrl, currentPageUrl), '..', url);
    } else if (!url?.startsWith('http')) {
      url = join(vaultPath, url);
    }

    return url.replace(/\/$/, '');
  }

  fixImages(page: HTMLElement): void {
    page.querySelectorAll('img[src]').forEach(img => {
      let src = img.getAttribute('src');
      if (!src) return;
      if (src.startsWith('//')) {
        src = 'https:' + src;
      }

      img.setAttribute('src', src);
      const parentAnchor = img.closest('a');
      parentAnchor?.replaceWith(img);
    });
  }
}
