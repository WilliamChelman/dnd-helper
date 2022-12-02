import { Injectable } from 'injection-js';
import { HTMLElement, parse } from 'node-html-parser';
import path, { join } from 'path';
import ufo from 'ufo';
import sanitize from 'sanitize-filename';

import { ConfigService, Entity, EntityType, PageService, PageServiceFactory } from '../../core';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbMdHelper {
  private readonly folderMap: { [entityType: string]: string } = {
    MagicItem: 'Magic Items',
    Spell: 'Spells',
    Monster: 'Monsters',
  };

  private readonly pageService: PageService = this.pageServiceFactory.create(this.ddbHelper.getDefaultPageServiceOptions());

  constructor(private configService: ConfigService, private ddbHelper: DdbHelper, private pageServiceFactory: PageServiceFactory) {}

  keepOnlyFirstImage(content: HTMLElement): void {
    content.querySelectorAll('a img').forEach((img, index) => {
      if (index > 0) {
        img.parentNode.remove();
      } else {
        img.parentNode.replaceWith(img);
      }
    });
  }

  async adaptLinks(page: HTMLElement, currentPageUrl: string): Promise<void> {
    const vaultPath = this.configService.config.markdownYaml?.ddbVaultPath;
    if (!vaultPath) return;
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

  async urlToMdUrl(url: string, currentPageUrl: string): Promise<string> {
    const vaultPath = this.configService.config.markdownYaml?.ddbVaultPath;
    if (!vaultPath) return url;
    const fullUrl = this.getAbsoluteUrl(url, currentPageUrl);
    const type = this.ddbHelper.getType(fullUrl);
    const folder = this.folderMap[type];
    if (folder) {
      const content = await this.pageService.getPageHtmlElement(fullUrl);
      const name = content.querySelector('.page-title')?.innerText.trim();
      return path.join(folder, sanitize(name ?? ''));
    }
    return this.getAbsoluteUrl(url, currentPageUrl, vaultPath);
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

  private getAbsoluteUrl(url: string, currentPageUrl: string, replaceHost?: string): string {
    if (url.startsWith('//www')) url += 'https:' + url;

    if (url.startsWith('./')) {
      url = ufo.joinURL(currentPageUrl, '..', url);
    } else if (url.startsWith('/')) {
      url = ufo.stringifyParsedURL({ ...ufo.parseURL(currentPageUrl), pathname: url });
    }
    if (replaceHost) {
      const parsedReplacement = ufo.parseURL(replaceHost);
      url = ufo.stringifyParsedURL({ ...ufo.parseURL(url), host: parsedReplacement.host, protocol: parsedReplacement.protocol });
    }
    return url.replace(/\/$/, '');
  }
}
