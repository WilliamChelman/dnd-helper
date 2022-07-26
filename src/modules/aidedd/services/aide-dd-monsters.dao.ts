import { Injectable } from 'injection-js';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { HTMLElement, parse } from 'node-html-parser';
import { URL } from 'url';

import { EntityDao, LabelsHelper, LoggerFactory, OldMonster, notNil, PageService, PageServiceFactory } from '../../core';

@Injectable()
export class AideDdMonstersDao implements EntityDao<OldMonster> {
  id: string = 'aide-dd-monsters';
  private basePath = 'https://www.aidedd.org';
  private pageService: PageService = this.pageFactoryService.create({
    cacheContext: true,
  });
  private logger = this.loggerFactory.create('AideDdMonstersDao');

  constructor(private pageFactoryService: PageServiceFactory, private labelsHelper: LabelsHelper, private loggerFactory: LoggerFactory) {}

  async getAll(): Promise<OldMonster[]> {
    const partialMonsters = await this.getPartialMonsters();
    const monsters: OldMonster[] = [];
    let index = 0;
    for (let monster of partialMonsters) {
      this.logger.info(`Processing ${index}/${partialMonsters.length - 1} - ${monster.name}`);
      monster = await this.completeMonsterWithDetailPage(monster);
      monsters.push(monster);
      ++index;
    }

    return monsters;
  }
  getByUri(uri: string): Promise<OldMonster> {
    throw new Error('Method not implemented.');
  }
  save(entity: OldMonster): Promise<string> {
    throw new Error('Method not implemented.');
  }
  patch(entity: OldMonster): Promise<string> {
    throw new Error('Method not implemented.');
  }
  canHandle(entityType: string): number {
    throw new Error('Method not implemented.');
  }

  async getPartialMonsters(): Promise<OldMonster[]> {
    const listPageUrl = new URL('/regles/liste-monstres/', this.basePath).toString();
    const listPage = await this.pageService.getPageHtmlElement(listPageUrl);
    const anchors = listPage.querySelectorAll('.content .liste a');
    return anchors.map(anchor => {
      const name = anchor.innerText.trim().replace('(legacy)', '(Legacy)');
      const href = anchor.getAttribute('href')?.replace('..', '')!;
      const uri = new URL(href, listPageUrl).toString();
      return {
        name: this.labelsHelper.getName(name)!,
        uri,
        entityType: 'Monster' as const,
        id: uri.match(/\?vf=(.*)/)![1],
        link: uri,
        isLegacy: name.includes('(Legacy)'),
        dataSource: 'AideDD',
        lang: 'fr',
      };
    });
  }

  async completeMonsterWithDetailPage(partialMonster: OldMonster): Promise<OldMonster> {
    const monster = { ...partialMonster };
    const detailPage = await this.pageService.getPageHtmlElement(partialMonster.link!);
    const content = detailPage.querySelector('.bloc .jaune');

    if (!content) {
      throw new Error('Failed to find page content');
    }

    monster.source = this.getSource(detailPage.querySelector('.source')?.innerText);
    const altNames = detailPage
      ?.querySelector('.trad')
      ?.innerText?.match(/\[([^\]]*)\]/g)
      ?.map(v => v.replace('[', '').replace(']', '').trim())
      .map(n => (monster.isLegacy ? `${n} (Legacy)` : n));
    monster.altNames = altNames;

    const typeBlock = content.querySelector('.type')?.innerText.trim();
    const typeMatch = typeBlock?.match(/(.*) de taille (.*), (.*)/);
    const subtypeRegexp = /(\(.*\))/;
    const typeAndSubType = typeMatch?.[1].match(/([^\(]+)( \(.*\))?/);
    monster.subtype = typeMatch?.[1].match(subtypeRegexp)?.[1].replace('(', '').replace(')', '').trim();
    monster.type = typeAndSubType?.[1].replace(subtypeRegexp, '').trim();
    monster.size = typeMatch?.[2];
    monster.alignment = typeMatch?.[3];

    content.querySelectorAll('strong').forEach(header => {
      const rawValue = header.nextSibling.innerText.trim();
      if (header.innerText.includes("Classe d'armure")) {
        const value = rawValue.match(/(\d+)/)?.[1];
        if (value) {
          monster.armorClass = parseInt(value);
        }
      } else if (header.innerText.includes('Points de vie')) {
        const value = rawValue.match(/(\d+)/)?.[1];
        if (value) {
          monster.avgHitPoints = parseInt(value);
        }
      } else if (header.innerText.includes('Vitesse')) {
        monster.movementTypes = this.getDistanceField(rawValue);
      } else if (header.innerText.includes('Sens')) {
        monster.senses = this.getDistanceField(rawValue);
      } else if (header.innerText.includes('Résistances aux dégâts')) {
        monster.resistances = this.getDamageField(rawValue);
      } else if (header.innerText.includes('Immunités aux dégâts')) {
        monster.damageImmunities = this.getDamageField(rawValue);
      } else if (header.innerText.includes('Vulnérabilités aux dégâts')) {
        monster.vulnerabilities = this.getDamageField(rawValue);
      } else if (header.innerText.includes('Langues')) {
        monster.languages = rawValue
          .replace('--', '')
          .split(',')
          .map(v => v.trim())
          .filter(v => !v.match(/\s/));
      } else if (header.innerText.includes('Jets de sauvegarde')) {
        monster.saveProficiencies = rawValue
          .replace(/[\-\+]\d+/g, '')
          .split(',')
          .map(v => v.trim());
      } else if (header.innerText.includes('Compétences')) {
        monster.skillProficiencies = rawValue
          .replace(/[\-\+]\d+/g, '')
          .split(',')
          .map(v => v.trim());
      } else if (header.innerText.includes('Puissance')) {
        monster.challenge = rawValue.match(/([\d\/]+)/)?.[1];
      }
    });
    monster.isLegendary = content.querySelectorAll('.rub').some(rub => rub.innerText.includes('ACTIONS LÉGENDAIRES'));
    const imgLink = detailPage.querySelector('.picture img')?.getAttribute('src');
    monster.coverLink = imgLink;
    monster.iconLink = imgLink;
    this.cleanContent(content);
    monster.markdownContent = NodeHtmlMarkdown.translate(content.outerHTML, { blockElements: ['br'] });

    return monster;
  }

  private getSource(value: string | undefined): string | undefined {
    if (!value) return value;
    value = value.trim();
    if (value.startsWith('Rules (')) {
      value = value.replace('Rules (', '').replace(')', '').trim();
    } else if (value.startsWith('Adventures (')) {
      value = value.replace('Adventures (', '').replace(')', '').trim();
    }

    return this.labelsHelper.getSource(value);
  }

  private cleanContent(content: HTMLElement): void {
    const attributes = content.querySelectorAll('.carac');
    const labels: string[] = [];
    const values: string[] = [];
    const cleanText = (value: string) => value.trim();
    attributes.forEach(attr => {
      const label = attr.querySelector('strong')?.innerText.trim() ?? '';
      labels.push(`<td>${cleanText(label)}</td>`);
      const value = attr.innerText.replace(label, '').trim();
      values.push(`<td>${cleanText(value)}</td>`);
    });

    const abilityTable = parse(`
      <table>
        <tbody>
          <tr>${labels.join('')}</tr>
          <tr>${values.join('')}</tr>
        </tbody>
      </table>
    `);
    for (let i = 0; i < attributes.length; ++i) {
      if (i === 0) {
        attributes[i].replaceWith(abilityTable);
      } else {
        attributes[i].remove();
      }
    }

    content.querySelectorAll('a').forEach(anchor => {
      anchor.replaceWith(parse(`<span>${anchor.innerText}</span>`));
    });
  }

  private getDistanceField(value: string): string[] {
    return value.split(',').map(v => v.match(/([\w\s]+) \d+ m\.?/)?.[1]?.trim() ?? '');
  }

  private getDamageField(value: string): string[] {
    const specialMatch = /((contondant|contondant|tranchant).*)/i;
    const special = value.match(specialMatch)?.[1]?.replace(/, /g, ' ');
    value = value.replace(specialMatch, '').replace(';', '');
    return [special, ...value.split(',')].map(v => v?.trim()).filter(notNil);
  }
}
