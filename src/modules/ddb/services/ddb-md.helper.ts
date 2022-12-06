import { Injectable } from 'injection-js';
import { HTMLElement, parse } from 'node-html-parser';
import path from 'path';
import defu from 'defu';
import sanitize from 'sanitize-filename';
import { memoize } from 'lodash';

import { ConfigService, HtmlElementHelper, NewPageService } from '../../core';
import { DdbLinkHelper } from './ddb-link.helper';
import { DdbSourcesHelper } from './ddb-sources.helper';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbMdHelper {
  constructor(
    private pageService: NewPageService,
    private configService: ConfigService,
    private ddbHelper: DdbHelper,
    private ddbLinkHelper: DdbLinkHelper,
    private ddbSourcesHelper: DdbSourcesHelper,
    private htmlElementHelper: HtmlElementHelper
  ) {
    this.urlToMdUrl = memoize(this.urlToMdUrl.bind(this), (url, currentUrl) => [url, currentUrl].join('@@'));
  }

  async applyFixes(options: DdbMdFixes): Promise<void> {
    options = defu(options, { adaptLinks: true, fixImages: true, keepOneImage: 'first' } as Partial<DdbMdFixes>);
    if (options.keepOneImage) this.keepOnlyOneImage(options.content, options.keepOneImage);
    if (options.fixImages) this.fixImages(options.content);
    if (options.adaptLinks) await this.adaptLinks(options.content, options.currentPageUrl);
  }

  keepOnlyOneImage(content: HTMLElement, type: 'first' | 'last'): void {
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
        href = encodeURI(href);
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
      if (
        type === 'Monster' &&
        content.querySelectorAll('header.page-header .badge-label').some(el => el.innerText.toLowerCase().includes('legacy'))
      ) {
        name = `${name} (Legacy)`;
      }
      name = sanitize(name);

      if (type === 'SourcePage') {
        const breadcrumbs = content.querySelectorAll('.b-breadcrumb.b-breadcrumb-a a');
        let sourceUri = breadcrumbs[breadcrumbs.length - 2]?.getAttribute('href')!;
        if (sourceUri) {
          sourceUri = this.ddbLinkHelper.getAbsoluteUrl(sourceUri, fullUrl);
          const sourceContent = await this.pageService.getPageHtmlElement(sourceUri, this.ddbHelper.getDefaultPageServiceOptions());
          const index = this.ddbSourcesHelper.getSourcePageLinks(sourceUri, sourceContent).findIndex(url => url === fullUrl.split('#')[0]);
          if (index >= 0) {
            name = `${(index + 1).toString().padStart(2, '0')} ${name}`;
          }
          if (fullUrl.includes('#')) {
            const id = fullUrl.split('#')[1];
            const headingTitle = content.getElementById(id)?.innerText.trim();
            name = `${name}#${headingTitle}`;
          }
          const sourcePath = await this.urlToMdUrl(sourceUri);
          return path.join(sourcePath, '..', name);
        }
      } else {
        const folder = this.configService.config.markdownYaml?.folderEntityTypeMap[type];
        if (folder) {
          if (type === 'Source') {
            return path.join(folder, name, `00 Index`);
          }
          return path.join(folder, name);
        }
      }
    }

    return this.ddbLinkHelper.replaceHost(fullUrl, '');
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

export interface DdbMdFixes {
  currentPageUrl: string;
  content: HTMLElement;
  fixImages?: boolean;
  adaptLinks?: boolean;
  keepOneImage?: 'first' | 'last';
}
