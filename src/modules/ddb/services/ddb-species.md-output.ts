import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, EntityType, Species } from '../../core';
import { AdditionalTagFields } from '../../markdown-yaml';
import { DdbEntityMdOutput } from './ddb-entity.md-output';
import { DdbMdHelper } from './ddb-md.helper';

@Injectable()
export class DdbSpeciesMdOutput extends DdbEntityMdOutput<Species> {
  protected entityType: EntityType = 'Class';
  protected additionalTagFields: AdditionalTagFields<Species>[] = [['isLegacy', 'legacy'], 'source'];

  constructor(configService: ConfigService, ddbMdHelper: DdbMdHelper) {
    super(configService, ddbMdHelper);
  }

  canHandle(entity: Species): number | undefined {
    return entity.type === 'Species' ? 10 : undefined;
  }

  protected async getMarkdownContent(entity: Species): Promise<string> {
    const content = parse(entity.textContent);

    content.querySelectorAll('.compendium-header-subtitle, .secondary-content, .nav-select').forEach(el => el.remove());

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri, keepImages: 'all' });

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
