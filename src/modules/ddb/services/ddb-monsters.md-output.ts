import { Injectable } from 'injection-js';
import { parse, HTMLElement } from 'node-html-parser';

import { ConfigService, EntityType, InfoBoxOptions, KeyValue, Monster } from '../../core';
import { AdditionalTagFields, ObsidianMdHelper } from '../../markdown-yaml';
import { DdbEntityMdOutput } from './ddb-entity.md-output';
import { DdbMdHelper } from './ddb-md.helper';

@Injectable()
export class DdbMonstersMdOutput extends DdbEntityMdOutput<Monster> {
  protected entityType: EntityType = 'Monster';
  protected additionalTagFields: AdditionalTagFields<Monster>[] = [
    ['monsterType', 'type'],
    ['challenge', 'cr'],
    ['isLegendary', 'legendary'],
    ['isMythic', 'mythic'],
    ['hasLair', 'lair'],
    'environment',
    'source',
  ];

  constructor(protected configService: ConfigService, protected ddbMdHelper: DdbMdHelper, private obsidianMdHelper: ObsidianMdHelper) {
    super(configService, ddbMdHelper);
  }

  protected async getMarkdownContent(entity: Monster): Promise<string> {
    const content = parse(entity.textContent);

    const title = content.querySelector('.mon-stat-block__name');
    const newTitle = parse(`<h1>${title?.innerText.trim()}</h1>`);
    title?.replaceWith(newTitle);

    content.querySelectorAll('.mon-stat-block__description-block-heading').forEach(h2 => {
      h2.replaceWith(parse(`<h2>${h2.innerText.trim()}</h2>`));
    });

    content.querySelector('footer')?.remove();
    const moreInfo = content.querySelector('.mon-details__description-block');
    moreInfo?.replaceWith(`<h2>More Info</h2> ${moreInfo.outerHTML}`);

    this.ddbMdHelper.fixStatBlocks(content, {
      containers: '.ability-block',
      headings: '.ability-block__heading',
      values: '.ability-block__data',
    });

    // fix for https://www.dndbeyond.com/monsters/94512-sibriex, failed to be translated to notion
    const complexBlockquote = content.querySelector('blockquote table')?.parentNode;
    if (complexBlockquote) {
      complexBlockquote.replaceWith(parse(`<div>${complexBlockquote.innerHTML}</div>`));
    }

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri, keepImages: 'first' });

    const infoboxConfig = this.configService.config.markdownYaml?.typeConfig.Monster.infobox;
    if (infoboxConfig) {
      return await this.getMdWithInfoBox(entity, content, infoboxConfig);
    }

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }

  private async getMdWithInfoBox(entity: Monster, content: HTMLElement, infoboxConfig: InfoBoxOptions): Promise<string> {
    const img = content.querySelector('img');
    const imgSrc = img?.getAttribute('src');
    const imgAlt = img?.getAttribute('alt');

    const properties: KeyValue[] = [
      {
        key: 'Type',
        value: entity.monsterType ?? '?',
      },
      {
        key: 'CR',
        value: entity.challenge ?? '?',
      },
      {
        key: 'HP (avg.)',
        value: entity.avgHitPoints?.toString() ?? '?',
      },
    ];

    const infobox = this.obsidianMdHelper.getInfoBox({ entity, imgAlt, imgSrc, properties, imgSize: infoboxConfig.imageSize });
    img?.remove();

    const md = await super.getMarkdownContent({ ...entity, textContent: content.outerHTML });

    return [infobox, md].join('\n\n');
  }
}
