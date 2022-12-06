import { Injectable } from 'injection-js';

@Injectable()
export class DdbItemsService {
  // private pageService: PageService;
  // constructor(pageServiceFactory: PageServiceFactory, private labelsHelper: LabelsHelper, private ddbHelper: DdbHelper) {
  //   this.pageService = pageServiceFactory.create({ ...this.ddbHelper.getDefaultPageServiceOptions() });
  // }
  // async getPartialItems(options?: MonstersFilteringOptions): Promise<OldItem[]> {
  //   let searchPageUrl = new URL('/equipment', this.ddbHelper.basePath).toString();
  //   if (options?.name) {
  //     searchPageUrl += `?filter-search=${encodeURIComponent(options.name)}`;
  //   }
  //   return await this.ddbHelper.crawlSearchPages<OldItem>(searchPageUrl, this.getItemsFromSearchPage.bind(this), this.pageService);
  // }
  // private getItemsFromSearchPage(page: HTMLElement): OldItem[] {
  //   const monsterBlocks = page.querySelectorAll('ul.listing li');
  //   return monsterBlocks
  //     .map(block => {
  //       const linkAnchor = block.querySelector('.list-row-name a:not(.badge-cta)');
  //       if (!linkAnchor) return undefined;
  //       const link = new URL(linkAnchor.getAttribute('href')!, this.ddbHelper.basePath).toString();
  //       const name = linkAnchor.innerText.trim();
  //       return {
  //         name: this.labelsHelper.getName(name)!,
  //         uri: link,
  //         entityType: 'Item' as const,
  //         id: link.split('/').pop()!,
  //         type: block.querySelector('.list-row-name-secondary-text')?.innerText.trim(),
  //         lang: 'EN',
  //         dataSource: 'DDB',
  //       };
  //     })
  //     .filter(notNil);
  // }
  // async completeItemWithDetailPage(partialItem: OldItem): Promise<OldItem> {
  //   const item = { ...partialItem };
  //   const page = await this.pageService.getPageHtmlElement(item.uri);
  //   const content = page.querySelector('.more-info.details-more-info');
  //   if (!content) return item;
  //   this.cleanupContent(content, item);
  //   item.markdownContent = NodeHtmlMarkdown.translate(content.outerHTML, { blockElements: ['br'] });
  //   return item;
  // }
  // private cleanupContent(content: HTMLElement, monster: OldItem) {
  //   const links = content.querySelectorAll('a[href]');
  //   links.forEach(link => {
  //     const fullHref = new URL(link.getAttribute('href')!, monster.uri).toString();
  //     link.setAttribute('href', fullHref);
  //   });
  // }
}
