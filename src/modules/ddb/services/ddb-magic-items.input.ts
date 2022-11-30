import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import { ConfigService, HtmlElementHelper, InputService, LabelsHelper, MagicItem, PageService, PageServiceFactory } from '../../core';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbMagicItemsInput implements InputService<MagicItem> {
  sourceId: string = 'DDB';

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

  async *getAll(): AsyncGenerator<MagicItem> {
    let searchPageUrl = new URL('/magic-items', this.ddbHelper.basePath).toString();
    const uris = await this.ddbHelper.crawlSearchPages<string>(
      searchPageUrl,
      this.getMagicItemLinksSearchPage.bind(this),
      this.pageService
    );
    let index = 0;
    for (const uri of uris) {
      ++index;
      console.info(`Parsing (${index}/${uris.length})`, uri);
      if (this.blacklist.includes(uri)) continue;
      yield await this.getMagicItemFromDetailPage(uri);
    }
  }

  canHandle(entityType: string): number | undefined {
    return entityType === 'MagicItem' ? 10 : undefined;
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
      type: 'MagicItem' as const,
      name: this.labelsHelper.getName(this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title'))!,
      textContent: content.outerHTML,
      dataSource: 'DDB',
      lang: 'EN',
    };

    return spell;
  }
}
