import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, EntityType, KeyValue, MagicItem } from '../../core';
import { AdditionalTagFields, ObsidianMdHelper } from '../../markdown-yaml';
import { DdbEntityMdOutput } from './ddb-entity.md-output';
import { DdbMagicItemsHelper } from './ddb-magic-items.helper';
import { DdbMdHelper } from './ddb-md.helper';

@Injectable()
export class DdbMagicItemsMdOutput extends DdbEntityMdOutput<MagicItem> {
  protected entityType: EntityType = 'MagicItem';
  protected additionalTagFields: AdditionalTagFields<MagicItem>[] = [
    ['magicItemType', 'type'],
    ['magicItemSubType', 'subtype'],
    'rarity',
    'classes',
    'isVariant',
  ];

  constructor(
    configService: ConfigService,
    ddbMdHelper: DdbMdHelper,
    private ddbMagicItemsHelper: DdbMagicItemsHelper,
    private obsidianMdHelper: ObsidianMdHelper
  ) {
    super(configService, ddbMdHelper);
  }

  protected async getMarkdownContent(entity: MagicItem): Promise<string> {
    const content = parse(entity.textContent);

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri });
    const infoboxConfig = this.configService.config.markdownYaml?.typeConfig.MagicItem.infobox;
    if (!infoboxConfig) return super.getMarkdownContent(entity);

    const img = content.querySelector('img');
    const imgSrc = img?.getAttribute('src');
    const imgAlt = img?.getAttribute('alt');

    const properties: KeyValue[] = [];
    if (entity.magicItemType) {
      let value = entity.magicItemType;
      if (entity.magicItemSubType) {
        value += ` (${entity.magicItemSubType})`;
      }
      properties.push({
        key: 'Type',
        value,
      });
    }

    properties.push({
      key: 'Rarity',
      value: entity.rarity ?? '?',
    });

    const { attunement } = this.ddbMagicItemsHelper.getDetailsInfo(content);
    properties.push({
      key: 'Attunement',
      value: attunement ? attunement : 'No',
    });

    const infobox = this.obsidianMdHelper.getInfoBox({ name: entity.name, imgAlt, imgSrc, properties, imgSize: infoboxConfig.imageSize });
    img?.remove();
    content.querySelector(this.ddbMagicItemsHelper.detailsSelector)?.remove();

    const md = await super.getMarkdownContent({ ...entity, textContent: content.outerHTML });

    return [infobox, md].join('\n\n');
  }
}
