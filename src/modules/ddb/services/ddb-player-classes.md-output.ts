import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, EntityType, PlayerClass, PlayerSubclass } from '../../core';
import { AdditionalTagFields } from '../../markdown-yaml';
import { DdbEntityMdOutput } from './ddb-entity.md-output';
import { DdbMdHelper } from './ddb-md.helper';

@Injectable()
export class DdbPlayerClassesMdOutput extends DdbEntityMdOutput<PlayerClass | PlayerSubclass> {
  protected entityType: EntityType = 'Class';
  protected additionalTagFields: AdditionalTagFields<PlayerClass | PlayerSubclass>[] = [['baseClass', 'class'], 'source'] as any;

  constructor(configService: ConfigService, ddbMdHelper: DdbMdHelper) {
    super(configService, ddbMdHelper);
  }

  canHandle(entity: PlayerClass | PlayerSubclass): number | undefined {
    return entity.type === 'Class' || entity.type === 'Subclass' ? 10 : undefined;
  }

  protected async saveOne(entity: PlayerClass | PlayerSubclass): Promise<string> {
    if (entity.type === 'Class') {
      const filePath = await super.saveOne({ ...entity, subclasses: undefined });
      for (const subclass of entity.subclasses ?? []) {
        await this.saveOne(subclass);
      }
      return filePath;
    }

    return super.saveOne(entity);
  }

  protected async getMarkdownContent(entity: PlayerClass | PlayerSubclass): Promise<string> {
    const content = parse(entity.textContent);

    if (entity.type === 'Class') {
      content.querySelectorAll('.compendium-header-subtitle, .secondary-content, .nav-select').forEach(el => el.remove());
    }

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri, keepImages: 'all' });

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
