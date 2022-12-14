import consola from 'consola';
import defu from 'defu';
import { Injectable } from 'injection-js';
import { memoize } from 'lodash';
import { HTMLElement, parse } from 'node-html-parser';
import path from 'path';

import { ConfigService, HtmlElementHelper, NewPageService, UrlHelper } from '../../core';
import { DdbLinkHelper } from './ddb-link.helper';
import { DdbSourcesHelper } from './ddb-sources.helper';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbMdHelper {
  private unreachablePages: (string | RegExp)[] = [/\/basic-rules\/monster-stat-blocks-.*$/];

  constructor(
    private pageService: NewPageService,
    private configService: ConfigService,
    private ddbHelper: DdbHelper,
    private ddbLinkHelper: DdbLinkHelper,
    private ddbSourcesHelper: DdbSourcesHelper,
    private htmlElementHelper: HtmlElementHelper,
    private urlHelper: UrlHelper
  ) {
    this.urlToMdUrl = memoize(this.urlToMdUrl.bind(this), (url, currentUrl) => [url, currentUrl].join('@@'));
  }

  async applyFixes(options: DdbMdFixes): Promise<void> {
    options = defu(options, { adaptLinks: true, fixImages: true, keepImages: 'first' } as Partial<DdbMdFixes>);
    if (options.keepImages) this.keepOnlyOneImage(options.content, options.keepImages);
    if (options.fixImages) this.fixImages(options.content);
    if (options.adaptLinks) await this.adaptLinks(options.content, options.currentPageUrl);
  }

  keepOnlyOneImage(content: HTMLElement, type: 'first' | 'last' | 'all'): void {
    if (type === 'all') return;
    content.querySelectorAll('img').forEach((img, index, arr) => {
      if (type === 'first' && index > 0) {
        img.parentNode.remove();
      } else if (type === 'last' && index < arr.length - 1) {
        img.parentNode.remove();
      }
    });
  }

  async adaptLinks(page: HTMLElement, currentPageUrl: string): Promise<void> {
    for (const anchor of page.querySelectorAll('a')) {
      if (!anchor.text.trim()) {
        anchor.remove();
        continue;
      }

      let href = anchor.getAttribute('href');
      if (href) {
        href = await this.urlToMdUrl(href, currentPageUrl);

        let separator = '#^';
        if (!href.includes(separator)) {
          separator = '#';
        }
        const split = href.split(separator);
        split[0] = encodeURI(split[0]);
        if (split[1]) {
          // no need for full uri encoding
          split[1] = split[1].replace(/ /g, '%20');
        }
        href = split.join(separator);

        anchor.setAttribute('href', href);
      }

      const previousText = anchor.previousSibling?.textContent;
      if (!previousText || previousText.trim().match(/\w$/)) {
        const wrapper = parse(`<span> </span>${anchor.outerHTML}`);
        anchor.replaceWith(wrapper);
      }
    }
  }

  async urlToMdUrl(url: string, currentPageUrl: string = url): Promise<string> {
    const fullUrl = this.ddbLinkHelper.getAbsoluteUrl(url, currentPageUrl);
    const type = this.ddbHelper.getType(fullUrl);

    if (type) {
      const content = await this.pageService.getPageHtmlElement(fullUrl, this.ddbHelper.getDefaultPageServiceOptions());
      let name = this.htmlElementHelper.getCleanedInnerText(content, '.page-title') ?? fullUrl;

      if (type === 'Species' && content.querySelector('h1 #legacy-badge')) {
        name = `${name} (Legacy)`;
      } else if (
        type === 'Monster' &&
        content.querySelectorAll('header.page-header .badge-label').some(el => el.innerText.toLowerCase().includes('legacy'))
      ) {
        name = `${name} (Legacy)`;
      }
      name = this.urlHelper.sanitizeFilename(name);

      if (type === 'SourcePage') {
        const breadcrumbs = content.querySelectorAll('.b-breadcrumb.b-breadcrumb-a a');
        let sourceUri = breadcrumbs[2]?.getAttribute('href')!;
        if (sourceUri) {
          sourceUri = this.ddbLinkHelper.getAbsoluteUrl(sourceUri, fullUrl);
          const sourceContent = await this.pageService.getPageHtmlElement(sourceUri, this.ddbHelper.getDefaultPageServiceOptions());
          if (this.ddbSourcesHelper.isTocPage(sourceContent)) {
            const pagesUris = this.ddbSourcesHelper.getSourcePageUrisFromSource(sourceUri, sourceContent);
            const index = pagesUris.findIndex(url => url === fullUrl.split('#')[0]);
            if (index >= 0) {
              name = `${(index + 1).toString().padStart(2, '0')} ${name}`;
            } else if (this.unreachablePages.some(p => fullUrl.match(p))) {
              return fullUrl;
            } else {
              consola.error({ url, currentPageUrl, fullUrl, sourceUri, pagesUris });
              throw new Error('Failed to create link to source page');
            }
          }

          name = this.adaptHashes(fullUrl, name, content);
          const sourcePath = await this.urlToMdUrl(sourceUri);
          return path.join(sourcePath, '..', name);
        }
      } else {
        const folder = this.configService.config.markdownYaml?.folderEntityTypeMap[type];
        name = this.adaptHashes(fullUrl, name, content);

        if (folder) {
          if (type === 'Source') {
            return path.join(folder, name, `00 ${name}`);
          }
          return path.join(folder, name);
        }
      }
    }

    return fullUrl;
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

  private adaptHashes(fullUrl: string, name: string, content: HTMLElement): string {
    if (!fullUrl.includes('#')) return name;

    const id = fullUrl.split('#')[1];
    const el = content.getElementById(id);
    // sometimes links are broken, like the first link in the section https://www.dndbeyond.com/sources/dmg/creating-a-campaign#1CreateaHomeBase
    if (!el) {
      return name;
    } else if (el.tagName.toLowerCase().match(/^h[1-5]$/)) {
      const headingTitle = el.innerText.trim();
      return `${name}#${headingTitle}`;
    }
    return `${name}#^${id}`;
  }
}

export interface DdbMdFixes {
  currentPageUrl: string;
  content: HTMLElement;
  fixImages?: boolean;
  adaptLinks?: boolean;
  keepImages?: 'first' | 'last' | 'all';
}
