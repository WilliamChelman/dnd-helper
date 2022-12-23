import { Injectable } from 'injection-js';

import { ConfigService, DataSource, EntityType, HtmlElementHelper, LabelsHelper, NewPageService, Spell } from '../../core';
import { DdbSearchableEntityInput } from './ddb-searchable-entity.input';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbSpellsInput extends DdbSearchableEntityInput<Spell> {
  sourceId: DataSource = 'ddb';

  protected entityType: EntityType = 'Spell';
  protected searchPagePath: string = 'https://www.dndbeyond.com/spells';
  protected linkSelector: string = 'ul.rpgspell-listing > div a';

  constructor(
    pageService: NewPageService,
    htmlElementHelper: HtmlElementHelper,
    ddbHelper: DdbHelper,
    labelsHelper: LabelsHelper,
    configService: ConfigService
  ) {
    super(pageService, htmlElementHelper, ddbHelper, labelsHelper, configService);
  }

  protected async getEntityFromDetailPage(uri: string): Promise<Spell> {
    const page = await this.pageService.getPageHtmlElement(uri, this.ddbHelper.getDefaultPageServiceOptions());

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
      const fullHref = new URL(link.getAttribute('href')!, uri).toString();
      link.setAttribute('href', fullHref);
    });

    const componentsText = this.htmlElementHelper
      .getCleanedInnerText(page, '.ddb-statblock-item-components .ddb-statblock-item-value')
      .replace(/\s?\*/, '');
    const spell: Spell = {
      uri,
      type: 'Spell' as const,
      name: this.labelsHelper.getName(this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title'))!,
      level: this.labelsHelper.getLevel(
        this.htmlElementHelper.getCleanedInnerText(page, '.ddb-statblock-item-level .ddb-statblock-item-value')
      ),
      castingTime: castingTime,
      rangeAndArea: rangeAndArea,
      components: componentsText.split(',').map(c => c.trim()),
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
      dataSource: 'ddb',
      lang: 'en',
    };

    return spell;
  }
}
