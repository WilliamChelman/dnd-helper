import { Injectable, Injector } from 'injection-js';
import { parse } from 'node-html-parser';

import { EntityType, KeyValue, PlayerClass, PlayerSubclass } from '../../core';
import { AdditionalTagFields, ObsidianMdHelper } from '../../markdown-yaml';
import { DdbEntityMdOutput } from './ddb-entity.md-output';

@Injectable()
export class DdbPlayerClassesMdOutput extends DdbEntityMdOutput<PlayerClass | PlayerSubclass> {
  protected entityType: EntityType = 'Class';
  protected additionalTagFields: AdditionalTagFields<PlayerClass | PlayerSubclass>[] = [['baseClass', 'class'], 'source'] as any;

  constructor(injector: Injector, private obsidianMdHelper: ObsidianMdHelper) {
    super(injector);
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
    let content;
    if (entity.type === 'Class') {
      content = parse(entity.textContent);
    } else {
      content = parse(`<h1>${entity.name}</h1> ${parse(entity.textContent)}`);
    }

    if (entity.type === 'Class') {
      content.querySelectorAll('.compendium-header-subtitle, .secondary-content, .nav-select').forEach(el => el.remove());
    }

    this.ddbMdHelper.fixStatBlocks(content, {
      containers: '.stat-block-ability-scores',
      headings: '.stat-block-ability-scores-heading',
      values: '.stat-block-ability-scores-data',
    });
    this.ddbMdHelper.wrapMonsterBlock(content);

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri, keepImages: 'all' });

    const infoboxConfig = this.configService.config.markdownYaml?.typeConfig.Species.infobox;
    if (!infoboxConfig) return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });

    const img = content.querySelector('img');
    const imgSrc = img?.getAttribute('src');
    const imgAlt = img?.getAttribute('alt');

    const properties: KeyValue[] = [];

    if (entity.type === 'Subclass') {
      properties.push({ key: 'Base Class', value: entity.baseClass ?? '?' });
      content.querySelector('.base-class-callout')?.remove();
    }

    const infobox = this.obsidianMdHelper.getInfoBox({ entity, imgAlt, imgSrc, properties, imgSize: infoboxConfig.imageSize });
    img?.remove();

    const md = await super.getMarkdownContent({ ...entity, textContent: content.outerHTML });

    return [infobox, md].join('\n\n');
  }
}
