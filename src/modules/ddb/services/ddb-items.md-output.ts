import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, EntityType, Item } from '../../core';
import { DdbEntityMdOutput } from './ddb-entity.md-output';
import { DdbMdHelper } from './ddb-md.helper';

@Injectable()
export class DdbItemsMdOutput extends DdbEntityMdOutput<Item> {
  protected entityType: EntityType = 'Item';

  constructor(configService: ConfigService, ddbMdHelper: DdbMdHelper) {
    super(configService, ddbMdHelper);
  }

  protected async getMarkdownContent(entity: Item): Promise<string> {
    const content = parse(entity.textContent);

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri, keepImages: 'last' });

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
