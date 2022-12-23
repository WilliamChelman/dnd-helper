import consola from 'consola';
import { Injectable, Injector } from 'injection-js';

import { DataSource, EntityType, InputService, Monster, notNil } from '../../core';
import { DdbSearchableEntityInput } from './ddb-searchable-entity.input';

@Injectable()
export class DdbMonstersInput extends DdbSearchableEntityInput<Monster> implements InputService<Monster> {
  sourceId: DataSource = 'ddb';

  protected entityType: EntityType = 'Monster';
  protected searchPagePath: string = 'https://www.dndbeyond.com/monsters';
  protected linkSelector: string = '.listing-body ul > div .name a:not(.badge-cta)';

  constructor(injector: Injector) {
    super(injector);
  }

  protected async getEntityFromDetailPage(uri: string): Promise<Monster> {
    const page = await this.pageService.getPageHtmlElement(uri, this.ddbHelper.getDefaultPageServiceOptions());

    const content = page.querySelector('.more-info.details-more-info');
    if (!content) {
      consola.log(uri);
      throw new Error('Failed to find monster content');
    }

    let name = this.htmlElementHelper.getCleanedInnerText(page, '.mon-stat-block__name-link');
    const isLegacy = page.querySelector('.page-heading .badge-label')?.innerText.toLowerCase().includes('legacy') ?? false;
    if (isLegacy) {
      name += ' (Legacy)';
    }
    const metaBlockText = this.htmlElementHelper.getCleanedInnerText(content, '.mon-stat-block__meta');
    let [typePart, alignmentPart] = metaBlockText.split(',');
    const splitType = typePart.split(' ');
    const size = splitType[0];
    typePart = splitType.slice(1).join(' ');
    let type;
    let subtype;

    if (typePart.includes('(')) {
      const match = typePart.match(/(.*) \((.*)\)/);
      type = match?.[1].trim() ?? '?';
      subtype = match?.[2].trim() ?? '?';
    } else {
      type = typePart.trim();
    }
    const monster: Monster = {
      uri,
      type: 'Monster',
      name,
      isLegacy,
      alignment: alignmentPart?.trim(),
      monsterType: type,
      subtype,
      size,
      lang: 'en',
      dataSource: 'ddb',
      isLegendary: content
        .querySelectorAll('.mon-stat-block__description-block-heading')
        .some(heading => heading.innerText.toLowerCase().includes('legendary actions')),
      textContent: content.outerHTML,
    };

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
      if (label.includes('Challenge')) {
        monster.challenge = value.match(/([\d|\/]+)/)?.[1] ?? '?';
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
    monster.source = monster.sourceDetails?.split(',')[0].trim();
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
