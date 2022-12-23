import { Injectable, Injector } from 'injection-js';
import { parse } from 'node-html-parser';

import { EntityType, Feat } from '../../core';
import { AdditionalTagFields } from '../../markdown-yaml';
import { DdbEntityMdOutput } from './ddb-entity.md-output';

@Injectable()
export class DdbFeatsMdOutput extends DdbEntityMdOutput<Feat> {
  protected entityType: EntityType = 'Feat';
  protected additionalTagFields: AdditionalTagFields<Feat>[] = ['halfFeat', 'source'];

  constructor(injector: Injector) {
    super(injector);
  }

  protected async getMarkdownContent(entity: Feat): Promise<string> {
    const content = parse(`<h1>${entity.name}</h1> ${parse(entity.textContent)}`);

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri, keepImages: 'none' });

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
