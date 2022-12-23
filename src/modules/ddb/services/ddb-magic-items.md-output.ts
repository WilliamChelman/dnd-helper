import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, EntityType, KeyValue, MagicItem } from '../../core';
import { AdditionalTagFields, Link, ObsidianMdHelper } from '../../markdown-yaml';
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
    'isLegacy',
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
    const content = parse(`<h1>${entity.name}</h1> ${parse(entity.textContent)}`);

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri });
    const infoboxConfig = this.configService.config.markdownYaml?.typeConfig.MagicItem.infobox;
    if (!infoboxConfig) return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });

    const img = content.querySelector('img');
    const imgSrc = img?.getAttribute('src');
    const imgAlt = img?.getAttribute('alt');

    const properties: KeyValue<string | Link>[] = [];
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

    if (entity.variantOf) {
      let href = await this.ddbMdHelper.uriToMdPath(entity.variantOf);
      href = this.ddbMdHelper.escapeUriForLink(href);
      properties.push({
        key: 'Variant of',
        value: {
          label: 'base item',
          href,
        },
      });
    }

    const infobox = this.obsidianMdHelper.getInfoBox({ entity, imgAlt, imgSrc, properties, imgSize: infoboxConfig.imageSize });
    img?.remove();
    content.querySelector(this.ddbMagicItemsHelper.detailsSelector)?.remove();

    const md = await super.getMarkdownContent({ ...entity, textContent: content.outerHTML });

    return [infobox, md].join('\n\n');
  }
}
