import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, EntityType, Source, SourcePage } from '../../core';
import { DdbEntityMdOutput } from './ddb-entity.md-output';
import { DdbLinkHelper } from './ddb-link.helper';
import { DdbMdHelper } from './ddb-md.helper';

@Injectable()
export class DdbSourcesMdOutput extends DdbEntityMdOutput<Source | SourcePage> {
  protected entityType: EntityType = 'Source';

  constructor(protected configService: ConfigService, protected ddbMdHelper: DdbMdHelper, private ddbLinkHelper: DdbLinkHelper) {
    super(configService, ddbMdHelper);
  }

  canHandle(entity: Source | SourcePage): number | undefined {
    return entity.type === 'Source' || entity.type === 'SourcePage' ? 10 : undefined;
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

  protected async getMarkdownContent(entity: Source | SourcePage): Promise<string> {
    let content = parse(entity.textContent);
    const isToc = !!content.querySelector('.compendium-toc-full-text');

    //need to do it before fixing links
    let coverArt = content.querySelector('.view-cover-art a')?.getAttribute('href');
    if (coverArt) {
      coverArt = this.ddbLinkHelper.getAbsoluteUrl(coverArt, entity.uri);
    }

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri, keepOneImage: undefined });

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
