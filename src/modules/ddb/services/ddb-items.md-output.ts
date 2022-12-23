import { Injectable } from 'injection-js';
import { parse, HTMLElement } from 'node-html-parser';

import { ConfigService, EntityType, InfoBoxOptions, Item, KeyValue } from '../../core';
import { AdditionalTagFields, ObsidianMdHelper } from '../../markdown-yaml';
import { DdbEntityMdOutput } from './ddb-entity.md-output';
import { DdbMdHelper } from './ddb-md.helper';

@Injectable()
export class DdbItemsMdOutput extends DdbEntityMdOutput<Item> {
  protected entityType: EntityType = 'Item';
  protected additionalTagFields: AdditionalTagFields<Item>[] = [['itemType', 'type'], 'source'];

  constructor(configService: ConfigService, ddbMdHelper: DdbMdHelper, private obsidianMdHelper: ObsidianMdHelper) {
    super(configService, ddbMdHelper);
  }

  protected async getMarkdownContent(entity: Item): Promise<string> {
    const content = parse(`<h1>${entity.name}</h1> ${parse(entity.textContent)}`);

    const infobox = this.configService.config.markdownYaml?.typeConfig.Item.infobox;

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri, keepImages: infobox ? 'first' : 'none' });
    if (infobox) {
      return this.getMdWithInfoBox(entity, content, infobox);
    }
    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }

  private async getMdWithInfoBox(entity: Item, content: HTMLElement, infoboxConfig: InfoBoxOptions): Promise<string> {
    const img = content.querySelector('img');
    const imgSrc = img?.getAttribute('src');
    const imgAlt = img?.getAttribute('alt');

    const properties: KeyValue[] = [
      {
        key: 'Type',
        value: entity.itemType ?? '?',
      },
      {
        key: 'Cost',
        value: entity.cost ?? '?',
      },
      {
        key: 'Weight',
        value: entity.weight ?? '?',
      },
    ];

    const infobox = this.obsidianMdHelper.getInfoBox({ entity, imgAlt, imgSrc, properties, imgSize: infoboxConfig.imageSize });
    img?.remove();
    content.querySelector('.details-container-content-description-text')?.remove();

    const md = await super.getMarkdownContent({ ...entity, textContent: content.outerHTML });

    return [infobox, md].join('\n\n');
  }
}
