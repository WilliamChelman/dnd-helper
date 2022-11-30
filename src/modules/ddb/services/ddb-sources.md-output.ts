import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, LoggerFactory, PrefixService, Source, SourcePage } from '../../core';
import { DefaultMdOutput } from '../../markdown-yaml';
import { DdbMdHelper } from './ddb-md.helper';

@Injectable()
export class DdbSourcesMdOutput extends DefaultMdOutput<Source | SourcePage> {
  constructor(
    protected loggerFactory: LoggerFactory,
    protected prefixService: PrefixService,
    protected configService: ConfigService,
    protected ddbMdHelper: DdbMdHelper
  ) {
    super(loggerFactory, prefixService, configService);
  }

  canHandle(entity: Source | SourcePage): number | undefined {
    return entity.type === 'Source' ? 10 : undefined;
  }

  protected async saveOne(entity: Source | SourcePage): Promise<string> {
    if (entity.type === 'Source') {
      const filePath = await super.saveOne({ ...entity, pages: undefined });
      for (const page of entity.pages ?? []) {
        await this.saveOne(page);
      }
      return filePath;
    }

    return super.saveOne(entity);
  }

  protected getMarkdownContent(entity: Source | SourcePage): string {
    let content = parse(entity.textContent);
    const isToc = !!content.querySelector('.compendium-toc-full-text');

    //need to do it before fixing links
    const coverArt = content.querySelector('.view-cover-art a')?.getAttribute('href');
    this.ddbMdHelper.fixImages(content);
    this.ddbMdHelper.fixLinks(content, entity.uri);

    if (isToc) {
      content.querySelectorAll('header.no-sub.no-nav').forEach(el => el.remove());
      content = content.querySelector('.compendium-toc-full-text')!;
      if (coverArt) {
        content = parse(`
          <h1>${entity.name}</h1>
          <img src="${coverArt}">
          ${content.outerHTML}
        `);
      }
    } else {
      content.querySelectorAll('h1 a, h2 a, h3 a, h4 a, h5 a').forEach(anchor => {
        anchor.replaceWith(parse(`<span>${anchor.innerHTML}</span>`));
      });

      content.querySelectorAll('.social-share').forEach(el => el.remove());

      const topNav = content.querySelector('.top-next-nav');
      if (topNav) {
        const anchors = topNav.querySelectorAll('a');
        const newNav = parse(`
        <table>
          <tr>
            ${anchors
              .map((anchor, index, arr) => {
                if (index === 0) {
                  anchor.textContent = `⬅️ ${anchor.textContent}`;
                } else if (index === arr.length - 1) {
                  anchor.textContent = `${anchor.textContent} ➡️`;
                }
                return `<td>${anchor.outerHTML}</td>
              `;
              })
              .join('')}
          </tr>
        </table>
        `);
        topNav.replaceWith(newNav);
        content = parse(`
          ${content.outerHTML}
          ${newNav.outerHTML}
        `);
      }
    }

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
