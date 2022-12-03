import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import { ConfigService, HtmlElementHelper, InputService, LabelsHelper, NewPageService, Spell } from '../../core';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbSpellsInput implements InputService<Spell> {
  sourceId: string = 'DDB';

  constructor(
    private pageService: NewPageService,
    private htmlElementHelper: HtmlElementHelper,
    private ddbHelper: DdbHelper,
    private labelsHelper: LabelsHelper,
    private configService: ConfigService
  ) {}

  async *getAll(): AsyncGenerator<Spell> {
    const { config } = this.configService;
    let pageUrl = new URL('/spells', this.ddbHelper.basePath).toString();
    if (config.ddb?.name) {
      pageUrl += `?filter-search=${encodeURIComponent(config.ddb?.name)}`;
    }

    const links = await this.ddbHelper.newCrawlSearchPages<string>(
      pageUrl,
      this.getSpellLinksSearchPage.bind(this),
      this.ddbHelper.getDefaultPageServiceOptions()
    );

    for (const link of links) {
      yield this.getSpellFromDetailPage(link);
    }
  }
  canHandle(entityType: string): number | undefined {
    return entityType === 'Spell' ? 10 : undefined;
  }

  private getSpellLinksSearchPage(page: HTMLElement): string[] {
    const links = page.querySelectorAll('ul.rpgspell-listing > div a');
    return links.map(link => {
      return new URL(link.getAttribute('href')!, this.ddbHelper.basePath).toString();
    });
  }

  private async getSpellFromDetailPage(url: string): Promise<Spell> {
    const page = await this.pageService.getPageHtmlElement(url, this.ddbHelper.getDefaultPageServiceOptions());

    const sourceDetails = this.htmlElementHelper.getCleanedInnerText(page, '.source.spell-source');
    let castingTime = this.htmlElementHelper.getCleanedInnerText(page, '.ddb-statblock-item-casting-time .ddb-statblock-item-value');
    const ritual = castingTime.endsWith('Ritual');
    if (ritual) {
      castingTime = castingTime.replace('Ritual', '').trim();
    }

    let duration = this.htmlElementHelper.getCleanedInnerText(page, '.ddb-statblock-item-duration .ddb-statblock-item-value');
    const concentration = duration.startsWith('Concentration');
    if (concentration) {
      duration = duration.replace('Concentration', '').trim();
    }
    let rangeAndArea = this.htmlElementHelper.getCleanedInnerText(page, '.ddb-statblock-item-range-area .ddb-statblock-item-value');
    const areaIcon = page.querySelector('.ddb-statblock-item-range-area .ddb-statblock-item-value i');
    if (areaIcon) {
      const geometry = areaIcon.classNames.split('-').pop();
      rangeAndArea = rangeAndArea.replace(')', `${geometry})`);
    }
    const content = page.querySelector('.more-info.details-more-info');
    if (!content) {
      throw new Error('Failed to get spell content');
    }
    const links = content.querySelectorAll('a[href]');
    links.forEach(link => {
      const fullHref = new URL(link.getAttribute('href')!, url).toString();
      link.setAttribute('href', fullHref);
    });

    const spell: Spell = {
      uri: url,
      type: 'Spell' as const,
      name: this.labelsHelper.getName(this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title'))!,
      level: this.labelsHelper.getLevel(
        this.htmlElementHelper.getCleanedInnerText(page, '.ddb-statblock-item-level .ddb-statblock-item-value')
      ),
      castingTime: castingTime,
      rangeAndArea: rangeAndArea,
      components: this.htmlElementHelper.getCleanedInnerText(page, '.ddb-statblock-item-components .ddb-statblock-item-value'),
      duration: duration,
      school: this.htmlElementHelper.getCleanedInnerText(page, '.ddb-statblock-item-school .ddb-statblock-item-value'),
      attackOrSave: this.htmlElementHelper.getCleanedInnerText(page, '.ddb-statblock-item-attack-save .ddb-statblock-item-value'),
      damageOrEffect: this.htmlElementHelper.getCleanedInnerText(page, '.ddb-statblock-item-damage-effect .ddb-statblock-item-value'),
      textContent: content.outerHTML,
      spellLists: page.querySelectorAll('.tags.available-for .class-tag').map(el => el.innerText),
      tags: page.querySelectorAll('.tags.spell-tags .spell-tag').map(el => el.innerText),
      sourceDetails: sourceDetails.split(',').slice(1).join(',').trim(),
      source: this.labelsHelper.getSource(sourceDetails.split(',')[0].trim()),
      ritual,
      concentration,
      dataSource: 'DDB',
      lang: 'EN',
    };

    return spell;
  }
}
