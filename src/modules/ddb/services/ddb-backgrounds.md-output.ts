import { Injectable, Injector } from 'injection-js';
import { parse } from 'node-html-parser';

import { Background, EntityType } from '../../core';
import { AdditionalTagFields } from '../../markdown-yaml';
import { DdbEntityMdOutput } from './ddb-entity.md-output';

@Injectable()
export class DdbBackgroundsMdOutput extends DdbEntityMdOutput<Background> {
  protected entityType: EntityType = 'Background';
  protected additionalTagFields: AdditionalTagFields<Background>[] = ['source'];

  constructor(injector: Injector) {
    super(injector);
  }

  protected async getMarkdownContent(entity: Background): Promise<string> {
    const content = parse(`<h1>${entity.name}</h1> ${parse(entity.textContent)}`);

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri, keepImages: 'none' });

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
