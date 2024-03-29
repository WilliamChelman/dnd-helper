import consola from 'consola';
import { existsSync, promises as fs } from 'fs';
import { Injectable, Injector } from 'injection-js';
import { parse } from 'node-html-parser';
import path from 'path';

import { Entity, EntityType, Source, SourcePage, UrlHelper } from '../../core';
import { DdbEntityMdOutput } from './ddb-entity.md-output';
import { DdbSourcesHelper } from './ddb-sources.helper';

@Injectable()
export class DdbSourcesMdOutput extends DdbEntityMdOutput<Source | SourcePage> {
  protected entityType: EntityType = 'Source';
  private compendiumSelectors: { [uri: string]: string } = {
    'https://www.dndbeyond.com/sources/phb/appendix-a-conditions': 'h3.compendium-hr',
    'https://www.dndbeyond.com/sources/basic-rules/using-ability-scores': 'h5',
  };

  constructor(
    injector: Injector,

    private urlHelper: UrlHelper,
    private ddbSourcesHelper: DdbSourcesHelper
  ) {
    super(injector);
  }

  canHandle(entity: Source | SourcePage): number | undefined {
    return entity.type === 'Source' || entity.type === 'SourcePage' ? 10 : undefined;
  }

  protected async saveOne(entity: Source | SourcePage): Promise<string> {
    await this.saveGlossary(entity);
    return super.saveOne(entity);
  }

  protected async getMarkdownContent(entity: Source | SourcePage): Promise<string> {
    let content = parse(entity.textContent);
    const isToc = this.ddbSourcesHelper.isTocPage(content);

    //need to do it before fixing links
    let coverArt = content.querySelector('.view-cover-art a, a.view-cover-art')?.getAttribute('href');

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri, keepImages: 'all', inlineTagsContent: false });

    if (isToc) {
      content.querySelectorAll('header.no-sub.no-nav').forEach(el => el.remove());
      content = parse(content.querySelectorAll('.compendium-toc-full').reduce((html, div) => html + div.outerHTML, ''));
      if (coverArt) {
        content = parse(`
          <h1>${entity.name}</h1>
          <img src="${coverArt}">
          ${content.outerHTML}
        `);
      }
      return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
    }
    content.querySelector('header h2')?.remove();
    this.ddbMdHelper.fixStatBlocks(content, {
      containers: '.stat-block-ability-scores',
      headings: '.stat-block-ability-scores-heading',
      values: '.stat-block-ability-scores-data',
    });
    this.ddbMdHelper.wrapMonsterBlock(content);
    content.querySelectorAll('h1 a, h2 a, h3 a, h4 a, h5 a').forEach(anchor => {
      anchor.replaceWith(parse(`<span>${anchor.innerHTML}</span>`));
    });

    content.querySelectorAll('.social-share').forEach(el => el.remove());

    content.querySelectorAll('.compendium-image-subtitle.heading-anchor').forEach(heading => {
      const sibling = heading.previousElementSibling;
      if (!sibling) return;
      if (heading.id) {
        const parent = heading.parentNode?.closest(`[id]`);
        // not exact match always because of https://www.dndbeyond.com/sources/bgdia/elturel-has-fallen#Map26GrandCemeteryOssuaryLevel
        if (parent?.id?.toLowerCase() === heading.id.toLowerCase()) {
          parent.querySelector('img')?.setAttribute('id', heading.id);
          parent.removeAttribute('id');
        }
      }
      sibling.replaceWith(`${heading.outerHTML} ${sibling.outerHTML}`);
      heading.remove();
    });

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

    content.querySelectorAll('aside').forEach(aside => {
      const id = aside.id;
      if (id) {
        aside.removeAttribute('id');
      }
      const blockQuote = parse(`<blockquote>${aside.innerHTML}</blockquote>`);
      if (id) {
        blockQuote.setAttribute('id', id);
      }

      aside.replaceWith(blockQuote);
    });

    content.querySelectorAll('table caption').forEach(caption => {
      const table = caption.parentNode;
      const id = caption.id;
      if (id) {
        caption.removeAttribute('id');
        table.setAttribute('id', id);
      }
      caption.remove();
      const wrapper = caption.querySelector('h1,h2,h3,h4,h5') ? 'div' : 'b';
      table.replaceWith(`<${wrapper}>${caption.innerHTML}</${wrapper}> ${table.outerHTML}`);
    });

    content.querySelectorAll('[id]:not(h1,h2,h3,h4,h5)').forEach(blockWithId => {
      const id = blockWithId.id;
      blockWithId.replaceWith(`${blockWithId.outerHTML} ^${id}`);
    });

    // TODO link to death domain in 35 appendix in PHB, certainly because of ":"
    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }

  private async saveGlossary(entity: Entity): Promise<void> {
    const selector = this.compendiumSelectors[entity.uri];
    if (!selector) return;
    const content = parse(entity.textContent);
    for (const compendium of content.querySelectorAll(selector)) {
      const name = this.urlHelper.sanitizeFilename(compendium.innerText.trim());
      const uri = await this.ddbMdHelper.uriToMdPath(`#${compendium.id}`, entity.uri);
      const content = `![[${uri}]]`;
      const filePath = path.join(this.getBasePath(), 'Glossary', name + '.md');

      if (!this.configService.config.force && existsSync(filePath)) {
        consola.log(`Skipping ${entity.name} as ${filePath} already exists`);
        continue;
      }
      consola.log(`Writing ${entity.name} in ${filePath}`);

      const folderPath = path.dirname(filePath);
      await fs.mkdir(folderPath, { recursive: true });
      await fs.writeFile(filePath, content, 'utf8');
    }
  }
}
