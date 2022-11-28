import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

import { InputService, LabelsHelper, LoggerFactory, NewMonster, notNil, PageService, PageServiceFactory } from '../../core';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbMonstersInput implements InputService<NewMonster> {
  sourceId: string = 'DDB';

  private pageService: PageService;
  private logger = this.loggerFactory.create('DdbMonstersDao');

  constructor(
    pageServiceFactory: PageServiceFactory,
    private labelsHelper: LabelsHelper,
    private ddbHelper: DdbHelper,
    private loggerFactory: LoggerFactory
  ) {
    this.pageService = pageServiceFactory.create({ ...this.ddbHelper.getDefaultPageServiceOptions() });
  }

  async *getAll(): AsyncGenerator<NewMonster> {
    const partialMonsters = await this.getPartialMonsters();
    let index = 0;
    for (let monster of partialMonsters) {
      this.logger.info(`Processing ${index}/${partialMonsters.length - 1} - ${monster.name}`);
      yield await this.completeMonsterWithDetailPage(monster);
      ++index;
    }
  }

  canHandle(entityType: string): number | undefined {
    return entityType === 'Monster' ? 10 : undefined;
  }

  private async getPartialMonsters(): Promise<PartialMonster[]> {
    let searchPageUrl = new URL('/monsters', this.ddbHelper.basePath).toString();
    return await this.ddbHelper.crawlSearchPages<PartialMonster>(
      searchPageUrl,
      this.getMonstersFromSearchPage.bind(this),
      this.pageService
    );
  }

  private getMonstersFromSearchPage(page: HTMLElement): PartialMonster[] {
    const monsterBlocks = page.querySelectorAll('.listing-body ul > div');
    return monsterBlocks
      .map(block => {
        const linkAnchor = block.querySelector('.name a:not(.badge-cta)');
        if (!linkAnchor) return undefined;
        const link = new URL(linkAnchor.getAttribute('href')!, this.ddbHelper.basePath).toString();
        const badge = block.querySelector('.badge-label')?.innerText.trim();
        const isLegacy = !!badge?.includes('Legacy');
        let name = linkAnchor.innerText.trim();
        if (isLegacy) {
          name += ' (Legacy)';
        }
        const subtype = block.querySelector('.monster-type .subtype')?.innerText.trim().replace('(', '').replace(')', '').trim();

        return {
          name: this.labelsHelper.getName(name)!,
          isLegacy,
          uri: link,
          type: 'Monster' as const,
          challenge: block.querySelector('.monster-challenge')?.innerText.trim(),
          source: this.labelsHelper.getSource(block.querySelector('.source')?.innerText.trim()),
          monsterType: block.querySelector('.monster-type .type')?.innerText.trim(),
          subtype: subtype ? capitalizeFirstLetter(subtype) : undefined,
          size: block.querySelector('.monster-size')?.innerText.trim(),
          alignment: block.querySelector('.monster-alignment')?.innerText.trim(),
          isLegendary: !!block.querySelector('.i-legendary-monster'),
          lang: 'EN',
          dataSource: 'DDB',
        } as PartialMonster;
      })
      .filter(notNil);
  }

  private async completeMonsterWithDetailPage(partialMonster: PartialMonster): Promise<NewMonster> {
    const monster = { ...partialMonster } as NewMonster;
    const page = await this.pageService.getPageHtmlElement(monster.uri);
    const content = page.querySelector('.more-info.details-more-info');

    if (!content) {
      console.log(partialMonster.uri);
      throw new Error('Failed to find monster content');
    }
    monster.textContent = content.outerHTML;

    const attributes = content.querySelectorAll('.mon-stat-block__attribute');

    attributes.forEach(attribute => {
      const label = attribute.querySelector('.mon-stat-block__attribute-label')?.innerText.trim();
      const value = attribute.querySelector('.mon-stat-block__attribute-data,.mon-stat-block__attribute-value')?.innerText.trim();
      if (value == null) return;
      if (label?.includes('Hit Points')) {
        const parsed = value?.match(/(\d+)/)?.[1];
        monster.avgHitPoints = parsed ? parseInt(parsed) : undefined;
      }
      if (label?.includes('Armor Class')) {
        const parsed = value?.match(/(\d+)/)?.[1];
        monster.armorClass = parsed ? parseInt(parsed) : undefined;
      }
      if (label?.includes('Speed')) {
        monster.movementTypes = this.getDistanceField(value);
      }
    });
    const tidbits = content.querySelectorAll('.mon-stat-block__tidbit');

    tidbits.forEach(tidbit => {
      const label = tidbit.querySelector('.mon-stat-block__tidbit-label')?.innerText.trim();
      const value = tidbit.querySelector('.mon-stat-block__tidbit-data')?.innerText.trim();
      if (value == null || label == null) return;

      if (label.includes('Saving Throws')) {
        monster.saveProficiencies = value
          .replace(/[\-\+]\d+/g, '')
          .split(',')
          .map(v => v.trim());
      }
      if (label.includes('Skills')) {
        monster.skillProficiencies = value
          .replace(/[\-\+]\d+/g, '')
          .split(',')
          .map(v => v.trim());
      }
      if (label.includes('Damage Immunities')) {
        monster.damageImmunities = this.getDamageField(value);
      }
      if (label.includes('Condition Immunities')) {
        monster.conditionImmunities = value.split(',').map(v => v.trim());
      }
      if (label.includes('Damage Vulnerabilities')) {
        monster.vulnerabilities = this.getDamageField(value);
      }
      if (label.includes('Damage Resistances')) {
        monster.resistances = this.getDamageField(value);
      }
      if (label.includes('Senses')) {
        monster.senses = this.getDistanceField(value);
      }
      if (label.includes('Languages') && value !== '--') {
        monster.languages = value
          .replace('--', '')
          .split(',')
          .map(v => v.trim())
          .filter(v => !v.match(/\s/));
      }
    });
    monster.environment = content.querySelectorAll('.environment-tag').map(env => env.innerText.trim());
    monster.tags = content.querySelectorAll('.monster-tag').map(env => env.innerText.trim());
    monster.sourceDetails = content.querySelector('.monster-source')?.innerText.trim();
    monster.isMythic = content
      .querySelectorAll('.mon-stat-block__description-block-heading')
      .some(heading => heading.innerText.includes('Mythic Actions'));

    return monster;
  }

  private getDamageField(value: string): string[] {
    const specialMatch = /((Bludgeoning|Piercing|Slashing).*)/;
    const special = value.match(specialMatch)?.[1]?.replace(/, /g, ' ');
    value = value.replace(specialMatch, '').replace(';', '');
    return [special, ...value.split(',')].map(v => v?.trim()).filter(notNil);
  }

  private getDistanceField(value: string): string[] {
    return value
      .split(',')
      .map(v => v.match(/([a-zA-Z]+).*ft\.?/)?.[1]?.trim() ?? '')
      .map(capitalizeFirstLetter);
  }
}

function capitalizeFirstLetter(v: string) {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

type PartialMonster = Pick<
  NewMonster,
  | 'name'
  | 'isLegacy'
  | 'uri'
  | 'type'
  | 'challenge'
  | 'source'
  | 'monsterType'
  | 'subtype'
  | 'size'
  | 'alignment'
  | 'isLegendary'
  | 'lang'
  | 'dataSource'
>;
