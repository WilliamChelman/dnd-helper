import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, EntityType, KeyValue, Species } from '../../core';
import { AdditionalTagFields, ObsidianMdHelper } from '../../markdown-yaml';
import { DdbEntityMdOutput } from './ddb-entity.md-output';
import { DdbMdHelper } from './ddb-md.helper';

@Injectable()
export class DdbSpeciesMdOutput extends DdbEntityMdOutput<Species> {
  protected entityType: EntityType = 'Class';
  protected additionalTagFields: AdditionalTagFields<Species>[] = [['isLegacy', 'legacy'], 'source'];

  constructor(configService: ConfigService, ddbMdHelper: DdbMdHelper, private obsidianMdHelper: ObsidianMdHelper) {
    super(configService, ddbMdHelper);
  }

  canHandle(entity: Species): number | undefined {
    return entity.type === 'Species' ? 10 : undefined;
  }

  protected async getMarkdownContent(entity: Species): Promise<string> {
    const content = parse(entity.textContent);
    content.querySelector('h1')?.replaceWith(`<h1>${entity.name}</h1>`);

    content.querySelectorAll('.compendium-header-subtitle, .secondary-content, .nav-select').forEach(el => el.remove());

    await this.ddbMdHelper.applyFixes({ content, currentPageUrl: entity.uri, keepImages: 'all' });

    const infoboxConfig = this.configService.config.markdownYaml?.typeConfig.Species.infobox;
    if (!infoboxConfig) return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });

    const img = content.querySelector('img');
    const imgSrc = img?.getAttribute('src');
    const imgAlt = img?.getAttribute('alt');

    const properties: KeyValue[] = [];

    properties.push({
      key: 'Legacy',
      value: entity.isLegacy ? 'Yes' : 'No',
    });

    const infobox = this.obsidianMdHelper.getInfoBox({ entity, imgAlt, imgSrc, properties, imgSize: infoboxConfig.imageSize });
    img?.remove();

    const md = await super.getMarkdownContent({ ...entity, textContent: content.outerHTML });

    return [infobox, md].join('\n\n');
  }
}
