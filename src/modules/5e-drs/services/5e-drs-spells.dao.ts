import { Injectable } from 'injection-js';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { HTMLElement } from 'node-html-parser';
import { URL } from 'url';
import { parse } from 'yaml';

import { LabelsHelper, LoggerFactory, PageService, PageServiceFactory, SourceEntityDao, Spell } from '../../core';
import { notNil } from '../../core/utils';

@Injectable()
export class FiveEDrsSpellsDao implements SourceEntityDao<Spell> {
  id: string = '5e-drs-spells';
  private basePath = 'https://5e-drs.fr';
  private pageService: PageService = this.pageFactoryService.create({
    cacheContext: true,
  });
  private logger = this.loggerFactory.create('FiveEDrsSpellsDao');

  constructor(private pageFactoryService: PageServiceFactory, private labelsHelper: LabelsHelper, private loggerFactory: LoggerFactory) {}

  async getAll(): Promise<Spell[]> {
    const partialSpells = await this.getPartialSpells();
    const spells: Spell[] = [];
    let index = 0;
    for (let spell of partialSpells) {
      this.logger.info(`Processing ${index}/${partialSpells.length - 1} - ${spell.name}`);
      spell = await this.completeSpellWithDetailPage(spell);
      spells.push(spell);
      ++index;
    }

    return spells;
  }

  async getPartialSpells(): Promise<Spell[]> {
    const items = [];
    let nextPage = new URL('/grimoire/', this.basePath).toString();
    let listPage = await this.pageService.getPageHtmlElement(nextPage);
    const pageNumbers = listPage.querySelectorAll('.v-pagination li').map(li => parseInt(li.innerText.trim()));
    const maxPage = Math.max(...pageNumbers.filter(n => !isNaN(n)));

    for (let i = 1; i <= maxPage; ++i) {
      nextPage = nextPage.split('?')[0];
      nextPage += `?page=${i}`;
      listPage = await this.pageService.getPageHtmlElement(nextPage);
      items.push(...this.getPartialSpellsFromOneSearchPage(listPage));
    }

    return items;
  }

  private getPartialSpellsFromOneSearchPage(searchPage: HTMLElement): Spell[] {
    const rows = searchPage.querySelectorAll('.v-data-table__wrapper tbody tr');
    return rows
      .map(row => {
        const anchor = row.querySelector('td:nth-child(3) a');
        if (!anchor) return undefined;
        const link = new URL(anchor.getAttribute('href') as string, this.basePath).toString();
        return {
          uri: link,
          entityType: 'Spell' as const,
          id: link
            .split('/')
            .filter(v => !!v)
            .pop()!,
          name: this.labelsHelper.getName(anchor.innerText.trim())!,
          link: link,
          dataSource: '5eDrs',
          lang: 'FR',
        };
      })
      .filter(notNil);
  }

  async completeSpellWithDetailPage(partialSpell: Spell): Promise<Spell> {
    const spell = { ...partialSpell };
    const detailPage = await this.pageService.getPageHtmlElement(partialSpell.uri);

    const metadata = await this.getGithubMetadata(partialSpell.uri);
    spell.school = this.labelsHelper.getSchool(metadata.school);
    spell.level = this.labelsHelper.getLevel(metadata.level);
    spell.spellLists = metadata.classes.map(c => this.labelsHelper.getClass(c)).filter(notNil);
    spell.concentration = metadata.concentration;
    spell.castingTime = metadata.casting_time;
    spell.rangeAndArea = metadata.range;
    spell.components = [
      metadata.components.verbal ? 'V' : undefined,
      metadata.components.somatic ? 'S' : undefined,
      metadata.components.material ? 'M' : undefined,
    ]
      .filter(notNil)
      .join(', ');
    if (metadata.components.materials) {
      spell.components += ` (${metadata.components.materials})`;
    }
    spell.duration = metadata.duration;
    spell.ritual = metadata.ritual;
    spell.source = this.labelsHelper.getSource(metadata.source);

    const content = detailPage.querySelector('.page.content');
    if (content) {
      this.cleanContent(content);
      spell.markdownContent = NodeHtmlMarkdown.translate(content.outerHTML, { blockElements: ['br'] });
    }

    return spell;
  }

  private cleanContent(content: HTMLElement): void {
    content.querySelectorAll('a').forEach(anchor => {
      const href = anchor.getAttribute('href');
      anchor.setAttribute('href', new URL(href as string, this.basePath).toString());
    });
  }

  private async getGithubMetadata(detailPageUrl: string): Promise<GithubMetadata> {
    const spellId = detailPageUrl
      .split('/')
      .filter(p => !!p)
      .pop();
    const githubPage = await this.pageService.getPageHtmlElement(
      `https://raw.githubusercontent.com/em-squared/5e-drs/master/docs/grimoire/${spellId}/README.md`
    );
    if (githubPage.innerText.includes('404: Not Found')) {
      throw new Error('github readme not found');
    }
    const githubMd = githubPage.querySelector('pre')?.innerText;
    const lines = githubMd?.split('\n') ?? [];
    let start, end;
    for (let i = 0; i < lines.length; ++i) {
      if (lines[i].startsWith('---')) {
        if (start == null) start = i;
        else {
          end = i;
          break;
        }
      }
    }
    const yamlPart = lines.slice(start, end).join('\n');
    return parse(yamlPart);
  }
}
// Generated by https://quicktype.io

export interface GithubMetadata {
  title: string;
  description: string;
  school: string;
  level: number;
  classes: string[];
  concentration: boolean;
  casting_time: string;
  range: string;
  components: Components;
  duration: string;
  ritual: boolean;
  source: string;
}

export interface Components {
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  materials: string;
}
