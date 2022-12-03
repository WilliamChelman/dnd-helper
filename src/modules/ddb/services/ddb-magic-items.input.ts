import consola from 'consola';
import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import { ConfigService, HtmlElementHelper, InputService, LabelsHelper, MagicItem, NewPageService } from '../../core';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbMagicItemsInput implements InputService<MagicItem> {
  sourceId: string = 'DDB';

  private blacklist: string[] = ['https://www.dndbeyond.com/legacy'];

  constructor(
    private pageService: NewPageService,
    private htmlElementHelper: HtmlElementHelper,
    private ddbHelper: DdbHelper,
    private labelsHelper: LabelsHelper,
    private configService: ConfigService
  ) {}

  async *getAll(): AsyncGenerator<MagicItem> {
    const { config } = this.configService;
    let pageUrl = new URL('/magic-items', this.ddbHelper.basePath).toString();
    if (config.ddb?.name) {
      pageUrl += `?filter-search=${encodeURIComponent(config.ddb?.name)}`;
    }

    const uris = await this.ddbHelper.newCrawlSearchPages<string>(
      pageUrl,
      this.getMagicItemLinksSearchPage.bind(this),
      this.ddbHelper.getDefaultPageServiceOptions()
    );
    let index = 0;
    for (const uri of uris) {
      ++index;
      console.info(`Parsing (${index}/${uris.length})`, uri);
      if (this.blacklist.includes(uri)) continue;
      // TODO include variants
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
    const page = await this.pageService.getPageHtmlElement(url, this.ddbHelper.getDefaultPageServiceOptions());

    const content = page.querySelector('.more-info');
    if (!content) {
      consola.error(url);
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
