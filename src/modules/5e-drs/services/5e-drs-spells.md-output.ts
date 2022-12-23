import { Injectable, Injector } from 'injection-js';
import parse from 'node-html-parser';

import { EntityType, Spell } from '../../core';
import { FiveEDrsEntityMdOutput } from './5e-drs-entity.md-output';

@Injectable()
export class FiveEDrsSpellsMdOutput extends FiveEDrsEntityMdOutput<Spell> {
  entityType: EntityType = 'Spell';
  private basePath = 'https://5e-drs.fr';

  constructor(injector: Injector) {
    super(injector);
  }

  protected async getMarkdownContent(entity: Spell): Promise<string> {
    const content = parse(entity.textContent);
    content.querySelectorAll('a').forEach(anchor => {
      const href = anchor.getAttribute('href');
      anchor.setAttribute('href', new URL(href as string, this.basePath).toString());
    });

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
