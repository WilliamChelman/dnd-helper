import { Injectable } from 'injection-js';
import parse from 'node-html-parser';

import { ConfigService, EntityType, Spell } from '../../core';
import { AideDdEntityMdOutput } from './aide-dd-entity.md-output';

@Injectable()
export class AideDdSpellsMdOutput extends AideDdEntityMdOutput<Spell> {
  entityType: EntityType = 'Spell';

  constructor(protected configService: ConfigService) {
    super(configService);
  }

  protected async getMarkdownContent(entity: Spell): Promise<string> {
    const content = parse(entity.textContent);
    content.querySelectorAll('a').forEach(anchor => {
      anchor.replaceWith(parse(`<span>${anchor.innerText}</span>`));
    });

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
