import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, EntityType, Spell } from '../../core';
import { AdditionalTagFields } from '../../markdown-yaml';
import { DdbEntityMdOutput } from './ddb-entity.md-output';
import { DdbMdHelper } from './ddb-md.helper';

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

  constructor(configService: ConfigService, ddbMdHelper: DdbMdHelper) {
    super(configService, ddbMdHelper);
  }

  protected async getMarkdownContent(entity: Spell): Promise<string> {
    const content = parse(entity.textContent);

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri });

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
}
