import consola from 'consola';
import { Injectable } from 'injection-js';
import { HTMLElement, parse } from 'node-html-parser';
import { URL } from 'url';

import { AssetsService, DataSource, InputService, LabelsHelper, NewPageService, notNil, Spell } from '../../core';
import { AideDdHelper } from './aide-dd.helper';

@Injectable()
export class AideDdSpellsInput implements InputService<Spell> {
  sourceId: DataSource = 'aide-dd';
  private basePath = 'https://www.aidedd.org';

  private altNames: { [name: string]: string[] } = this.assetsService.readJson('aidedd/spells-alt-names.json');

  constructor(
    private pageService: NewPageService,
    private labelsHelper: LabelsHelper,
    private assetsService: AssetsService,
    private helper: AideDdHelper
  ) {}

  canHandle(entityType: string): number | undefined {
    return entityType === 'Spell' ? 10 : undefined;
  }

  async *getAll(): AsyncGenerator<Spell> {
    const partialSpells = await this.getPartialSpells();
    let index = 0;
    for (let spell of partialSpells) {
      consola.info(`Processing ${spell.uri} (${index + 1}/${partialSpells.length})`);
      yield this.completeSpellWithDetailPage(spell);
      ++index;
    }
  }

  async getPartialSpells(): Promise<Spell[]> {
    const listPageUrl = new URL('/regles/sorts/', this.basePath).toString();
    const listPage = await this.pageService.getPageHtmlElement(listPageUrl, this.helper.getPageOptions());
    const anchors = listPage.querySelectorAll('.content .liste a');
    return anchors.map(anchor => {
      const name = anchor.innerText.trim();
      const href = anchor.getAttribute('href')!.replace('..', '');
      const uri = new URL(href, listPageUrl).toString();
      return {
        uri,
        type: 'Spell' as const,
        name: name,
        dataSource: 'aide-dd',
        lang: 'FR',
      } as Spell;
    });
  }

  async completeSpellWithDetailPage(partialMonster: Spell): Promise<Spell> {
    const spell = { ...partialMonster };
    const detailPage = await this.pageService.getPageHtmlElement(partialMonster.uri, this.helper.getPageOptions());
    const content = detailPage.querySelector('.bloc');

    if (!content) {
      throw new Error('Failed to find page content');
    }
    const altNames = detailPage
      ?.querySelector('.trad')
      ?.innerText?.match(/\[([^\]]*)\]/g)
      ?.map(v => v.replace('[', '').replace(']', '').trim())
      .filter(altName => altName !== spell.name);
    spell.altNames = altNames ?? [];
    if (this.altNames[spell.name!]) {
      spell.altNames.push(...this.altNames[spell.name!]);
    }
    spell.source = this.labelsHelper.getSource(detailPage.querySelector('.source')?.innerText);

    let schoolBlock = content.querySelector('.ecole')?.innerText.trim();
    if (schoolBlock?.includes('(rituel)')) {
      schoolBlock = schoolBlock.replace('(rituel)', '').trim();
      spell.ritual = true;
    }
    const schoolMatch = schoolBlock?.match(/niveau (\d) - (.*)/);

    spell.level = this.labelsHelper.getLevel(schoolMatch?.[1]);
    spell.school = this.labelsHelper.getSchool(schoolMatch?.[2]?.trim());

    content.querySelectorAll('*:not(.description) strong').forEach(el => {
      let value = el.nextSibling?.innerText.trim();
      if (!value) return;
      if (value.startsWith(':')) {
        value = value.replace(':', '').trim();
      }
      if (el.innerText.includes("Temps d'incantation")) {
        spell.castingTime = value;
      } else if (el.innerText.includes('Portée')) {
        spell.rangeAndArea = value;
      } else if (el.innerText.includes('Durée')) {
        spell.duration = value;
        spell.concentration = spell.duration.includes('concentration');
      } else if (el.innerText.includes('Composantes')) {
        spell.components = value;
      }
    });

    spell.spellLists = content
      .querySelectorAll('.classe')
      .map(el => this.labelsHelper.getClass(el.innerText.trim()))
      .filter(notNil);

    spell.textContent = content.outerHTML;

    return spell;
  }

  private cleanContent(content: HTMLElement): void {
    content.querySelectorAll('a').forEach(anchor => {
      anchor.replaceWith(parse(`<span>${anchor.innerText}</span>`));
    });
    content.querySelectorAll('.classe,.source,.ref').forEach(el => el.remove());
  }
}
