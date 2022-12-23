import consola from 'consola';
import defu from 'defu';
import { Inject, Injectable } from 'injection-js';
import { memoize } from 'lodash';
import { HTMLElement, parse } from 'node-html-parser';
import path from 'path';

import { ConfigService, Entity, InputService, PlayerSubclass, Source, SourcePage, UrlHelper } from '../../core';
import { DdbLinkHelper } from './ddb-link.helper';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbMdHelper {
  constructor(
    private configService: ConfigService,
    private ddbHelper: DdbHelper,
    private ddbLinkHelper: DdbLinkHelper,
    private urlHelper: UrlHelper,
    @Inject(InputService)
    private inputServices: InputService[]
  ) {
    this.uriToMdPath = memoize(this.uriToMdPath.bind(this), (url, currentUrl) => this.ddbLinkHelper.getAbsoluteUrl(url, currentUrl ?? url));
  }

  async applyFixes(options: DdbMdFixes): Promise<void> {
    options = defu(options, {
      adaptLinks: true,
      fixImages: true,
      keepImages: 'first',
      fixMissingWhitespace: true,
      inlineTagsContent: true,
    } as Partial<DdbMdFixes>);
    if (options.keepImages) this.keepImages(options.content, options.keepImages);
    if (options.fixImages) this.fixImages(options.content);
    if (options.adaptLinks) await this.adaptLinks(options.content, options.currentPageUrl);
    if (options.fixMissingWhitespace) this.fixMissingWhitespace(options.content);
    if (options.inlineTagsContent) this.inlineTagsContent(options.content);
  }

  keepImages(content: HTMLElement, type: DdbMdFixes['keepImages']): void {
    if (type === 'all') return;
    content.querySelectorAll('img').forEach((img, index, arr) => {
      if (type === 'none') {
        img.remove();
      } else if (type === 'first' && index > 0) {
        img.remove();
      } else if (type === 'last' && index < arr.length - 1) {
        img.remove();
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
        href = await this.uriToMdPath(href, currentPageUrl);
        href = this.escapeUriForLink(href);
        anchor.setAttribute('href', href);
      }
    }
  }

  escapeUriForLink(uri: string): string {
    let separator = '#^';
    if (!uri.includes(separator)) {
      separator = '#';
    }
    const split = uri.split(separator);
    split[0] = encodeURI(split[0]);
    if (split[1]) {
      // no need for full uri encoding
      split[1] = this.urlHelper.unescapeHtml(split[1]).replace(/\s/g, '%20');
    }
    return split.join(separator);
  }

  fixMissingWhitespace(page: HTMLElement): void {
    page.querySelectorAll('a,b,strong').forEach(el => {
      const previousText = el.previousSibling?.textContent;
      if (!previousText || previousText.trim().match(/(\w|,)$/)) {
        const wrapper = parse(`<span> </span>${el.outerHTML}`);
        el.replaceWith(wrapper);
      }
    });
  }

  inlineTagsContent(page: HTMLElement): void {
    page.querySelectorAll('.tags').forEach(tagsEl => {
      tagsEl.querySelectorAll('*').forEach((el, i, arr) => {
        let content = el.innerHTML;
        if (el.classList.contains('tag')) {
          if (i === 0) content = ` ${content}`;
          if (el.classList.contains('tag') && i < arr.length - 1) content += ', ';
        }
        el.replaceWith(`<span>${content}</span>`);
      });
    });
  }

  async uriToMdPath(uri: string, currentPageUrl: string = uri): Promise<string> {
    const fullUrl = this.ddbLinkHelper.getAbsoluteUrl(uri, currentPageUrl);
    let entity;
    try {
      entity = await this.getEntityByUri(fullUrl);
    } catch (err) {
      consola.error('Failed to get entity to generate md link', err);
      consola.log({ uri, currentPageUrl });
    }

    if (entity) {
      let name = entity.name;
      const type = entity.type;

      name = this.urlHelper.sanitizeFilename(name);

      if (type === 'SourcePage') {
        const content = parse(entity.textContent);

        let sourceUri = (entity as SourcePage).sourceUri;
        if (sourceUri) {
          const source = (await this.getEntityByUri(sourceUri))! as Source;

          if (source.pagesUris) {
            const index = source.pagesUris.findIndex(url => url === fullUrl.split('#')[0]);
            if (index >= 0) {
              name = `${(index + 1).toString().padStart(2, '0')}. ${name}`;
            } else if (this.ddbHelper.isUriBlacklisted(fullUrl) || sourceUri === currentPageUrl) {
              return fullUrl;
            } else {
              consola.error({ url: uri, currentPageUrl, fullUrl, sourceUri });
              throw new Error('Failed to create link to source page');
            }
          }

          name = this.adaptHashes(fullUrl, name, content);
          const sourcePath = await this.uriToMdPath(sourceUri);
          return path.join(sourcePath, '..', name);
        }
      } else if (type === 'Subclass') {
        const content = parse(entity.textContent);

        let baseClassUri = (entity as PlayerSubclass).baseClassUri;
        if (baseClassUri) {
          name = this.adaptHashes(fullUrl, name, content);
          const baseClassPath = await this.uriToMdPath(baseClassUri);
          return path.join(baseClassPath, name);
        }
      } else {
        const folder = this.configService.config.markdownYaml?.folderEntityTypeMap[type];
        name = this.adaptHashes(fullUrl, name, parse(entity.textContent));

        if (folder) {
          if (type === 'Source') {
            if (this.configService.config.markdownYaml?.typeConfig.Source.useFolderNoteForSourceRoot) {
              return path.join(folder, name.split('#')[0], name);
            } else {
              return path.join(folder, name, `00. ${name}`);
            }
          } else if (type === 'Class') {
            return path.join(folder, name, name);
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

  fixStatBlocks(page: HTMLElement, selectors: { containers: string; headings: string; values: string }): void {
    page.querySelectorAll(selectors.containers).forEach(abilityBlock => {
      const cleanText = (value: string) => value.trim();
      const abilityLabels = abilityBlock
        .querySelectorAll(selectors.headings)
        .map(labelBlock => `<td>${cleanText(labelBlock.innerText)}</td>`)
        .join('\n');
      const abilityValues = abilityBlock
        .querySelectorAll(selectors.values)
        .map(valueBlock => `<td>${cleanText(valueBlock.innerText)}</td>`)
        .join('\n');
      const abilityTable = parse(`
      <table>
        <tbody>
          <tr>${abilityLabels}</tr>
          <tr>${abilityValues}</tr>
        </tbody>
      </table>
    `);
      abilityBlock.replaceWith(abilityTable);
    });
  }

  wrapMonsterBlock(page: HTMLElement): void {
    page.querySelectorAll('.Basic-Text-Frame, .Basic-Text-Frame-2').forEach(abilityBlock => {
      if (abilityBlock.closest('blockquote')) return;
      abilityBlock.replaceWith(`<blockquote>${abilityBlock.outerHTML}</blockquote>`);
    });
  }

  private async getEntityByUri(uri: string): Promise<Entity | undefined> {
    uri = uri.split('#')[0];

    if (this.ddbHelper.isUriBlacklisted(uri)) {
      return undefined;
    }

    const type = this.ddbHelper.getType(uri);
    if (!type) return undefined;

    const input = this.inputServices.find(iS => iS.sourceId === 'ddb' && iS.canHandle(type));
    if (!input) return undefined;

    return input.getByUri(uri);
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
  fixMissingWhitespace?: boolean;
  adaptLinks?: boolean;
  keepImages?: 'first' | 'last' | 'all' | 'none';
  inlineTagsContent?: boolean;
}
