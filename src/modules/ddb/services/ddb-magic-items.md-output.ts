import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, EntityType, MagicItem } from '../../core';
import { AdditionalTagFields } from '../../markdown-yaml';
import { DdbEntityMdOutput } from './ddb-entity.md-output';
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

  constructor(configService: ConfigService, ddbMdHelper: DdbMdHelper) {
    super(configService, ddbMdHelper);
  }

  protected async getMarkdownContent(entity: MagicItem): Promise<string> {
    const content = parse(entity.textContent);

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri });

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
