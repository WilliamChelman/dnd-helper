import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, EntityType, Feat } from '../../core';
import { AdditionalTagFields } from '../../markdown-yaml';
import { DdbEntityMdOutput } from './ddb-entity.md-output';
import { DdbMdHelper } from './ddb-md.helper';

@Injectable()
export class DdbFeatsMdOutput extends DdbEntityMdOutput<Feat> {
  protected entityType: EntityType = 'Feat';
  protected additionalTagFields: AdditionalTagFields<Feat>[] = ['halfFeat', 'source'];

  constructor(configService: ConfigService, ddbMdHelper: DdbMdHelper) {
    super(configService, ddbMdHelper);
  }

  protected async getMarkdownContent(entity: Feat): Promise<string> {
    const content = parse(entity.textContent);

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri, keepImages: 'last' });

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
