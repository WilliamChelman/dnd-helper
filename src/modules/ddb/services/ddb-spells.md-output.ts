import { Injectable, Injector } from 'injection-js';
import { HTMLElement, parse } from 'node-html-parser';

import { EntityType, HtmlElementHelper, InfoBoxOptions, KeyValue, Spell } from '../../core';
import { AdditionalTagFields, ObsidianMdHelper } from '../../markdown-yaml';
import { DdbEntityMdOutput } from './ddb-entity.md-output';

@Injectable()
export class DdbSpellsMdOutput extends DdbEntityMdOutput<Spell> {
  protected entityType: EntityType = 'Spell';
  protected additionalTagFields: AdditionalTagFields<Spell>[] = [
    'ritual',
    'level',
    'school',
    'castingTime',
    'components',
    'concentration',
    'source',
    'spellLists',
  ];

  constructor(injector: Injector, private obsidianMdHelper: ObsidianMdHelper, private htmlElementsHelper: HtmlElementHelper) {
    super(injector);
  }

  protected async getMarkdownContent(entity: Spell): Promise<string> {
    const content = parse(`<h1>${entity.name}</h1> ${parse(entity.textContent)}`);

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri });

    const infoboxConfig = this.configService.config.markdownYaml?.typeConfig.Spell.infobox;
    if (infoboxConfig) {
      return this.getMdWithInfoBox(entity, content, infoboxConfig);
    }

    const stats = content.querySelectorAll('.ddb-statblock-spell .ddb-statblock-item-value');

    content.querySelector('.ddb-statblock-spell')?.replaceWith(
      parse(`
    <table>
      <tr><th>Level</th><th>Casting Time</th><th>Range/Area</th><th>Components</th></tr>
      <tr>${stats
        .slice(0, 4)
        .map(stat => `<td>${stat.innerText}</td>`)
        .join('')}</tr>
    </table>
    <table>
      <tr><th>Duration</th><th>School</th><th>Attack/Save</th><th>Damage/Effect</th></tr>
      <tr>${stats
        .slice(4, 8)
        .map(stat => `<td>${stat.innerText}</td>`)
        .join('')}</tr>
    </table>
`)
    );
    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }

  private async getMdWithInfoBox(entity: Spell, content: HTMLElement, infoboxConfig: InfoBoxOptions): Promise<string> {
    const img = content.querySelector('img');
    const imgSrc = img?.getAttribute('src');
    const imgAlt = img?.getAttribute('alt');

    const properties: KeyValue[] = [
      {
        key: 'Level',
        value: entity.level ?? '?',
      },
      {
        key: 'Casting Time',
        value: entity.castingTime ?? '?',
      },
      {
        key: 'Range/Area',
        value: entity.rangeAndArea ?? '?',
      },
      {
        key: 'Components',
        value: this.htmlElementsHelper.getCleanedInnerText(content, '.ddb-statblock-item-components .ddb-statblock-item-value') ?? '?',
      },
      {
        key: 'Duration',
        value: entity.duration ?? '?',
      },
      {
        key: 'School',
        value: entity.school ?? '?',
      },
      {
        key: 'Attack/Save',
        value: entity.attackOrSave ?? '?',
      },
      {
        key: 'Damage/Effect',
        value: entity.damageOrEffect ?? '?',
      },
    ];

    const infobox = this.obsidianMdHelper.getInfoBox({ entity, imgAlt, imgSrc, properties, imgSize: infoboxConfig.imageSize });
    img?.remove();
    content.querySelector('.ddb-statblock-spell')?.remove();

    const md = await super.getMarkdownContent({ ...entity, textContent: content.outerHTML });

    return [infobox, md].join('\n\n');
  }
}
