import { Injectable } from 'injection-js';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { HTMLElement } from 'node-html-parser';
import { join } from 'path';

import {
  Attachment,
  ConfigService,
  EntityDao,
  HtmlElementHelper,
  LabelsHelper,
  MagicItem,
  PageService,
  PageServiceFactory,
  Spell,
} from '../../core';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbMagicItemsDao implements EntityDao<MagicItem> {
  id: string = 'ddb-magic-items';

  private pageService: PageService;
  private blacklist: string[] = ['https://www.dndbeyond.com/legacy'];

  constructor(
    pageServiceFactory: PageServiceFactory,
    private htmlElementHelper: HtmlElementHelper,
    private ddbHelper: DdbHelper,
    private labelsHelper: LabelsHelper,
    private configService: ConfigService
  ) {
    this.pageService = pageServiceFactory.create({
      ...this.ddbHelper.getDefaultPageServiceOptions(),
    });
  }

  async getAll(): Promise<MagicItem[]> {
    return await this.getMagicItems();
  }
  async getByUri(uri: string): Promise<Spell> {
    throw new Error('not implemented');
  }
  async save(entity: Spell): Promise<string> {
    throw new Error('not implemented');
  }
  async patch(entity: Spell): Promise<string> {
    throw new Error('not implemented');
  }
  canHandle(entityType: string): number {
    throw new Error('not implemented');
  }

  private async getMagicItems(): Promise<MagicItem[]> {
    const spells = [];
    let searchPageUrl = new URL('/magic-items', this.ddbHelper.basePath).toString();
    const uris = await this.ddbHelper.crawlSearchPages<string>(
      searchPageUrl,
      this.getMagicItemLinksSearchPage.bind(this),
      this.pageService
    );
    let index = 0;
    for (const uri of uris) {
      // if (!uri.includes('4699-portable-hole')) continue;
      ++index;
      console.info(`Parsing (${index}/${uris.length})`, uri);
      if (this.blacklist.includes(uri)) continue;
      spells.push(await this.getMagicItemFromDetailPage(uri));
    }

    return spells;
  }

  private getMagicItemLinksSearchPage(page: HTMLElement): string[] {
    const links = page.querySelectorAll('ul.rpgmagic-item-listing > div a');
    return links
      .map(link => {
        const href = link.getAttribute('href');
        if (href?.match(/\.[a-z]+$/)) return undefined;
        return new URL(href!, this.ddbHelper.basePath).toString();
      })
      .filter(v => v != null) as string[];
  }

  private async getMagicItemFromDetailPage(url: string): Promise<MagicItem> {
    const page = await this.pageService.getPageHtmlElement(url);

    const content = page.querySelector('.more-info');
    if (!content) {
      console.log(url);
      throw new Error('Failed to get magic item content');
    }

    const spell: MagicItem = {
      uri: url,
      entityType: 'MagicItem' as const,
      id: url.split('/').pop()!,
      name: this.labelsHelper.getName(this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title'))!,
      ...this.toMarkdown(content),
      htmlContent: content.outerHTML,
      dataSource: 'DDB',
      lang: 'EN',
    };

    return spell;
  }

  private toMarkdown(content: HTMLElement): { markdownContent: string; attachments: Attachment[] } {
    content = content.clone() as HTMLElement;
    this.ddbHelper.fixForMarkdown(content);
    const attachments: Attachment[] = [];
    content.querySelectorAll('a img').forEach((img, index) => {
      if (index > 0) {
        img.parentNode.remove();
      } else {
        img.parentNode.replaceWith(img);
        // const src = img.getAttribute('src')!;
        // const fileName = encodeURIComponent(src);
        // const filePath = join('_assets', fileName);
        // img.setAttribute('src', filePath);
        // attachments.push({
        //   url: src,
        //   filePath: filePath,
        // });
      }
    });

    return { markdownContent: NodeHtmlMarkdown.translate(content.outerHTML, { blockElements: ['br'] }), attachments };
  }
}
