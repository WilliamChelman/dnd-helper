import { Injectable, Injector } from 'injection-js';
import parse from 'node-html-parser';

import { EntityType, Spell } from '../../core';
import { DdbMdHelper } from '../../ddb';
import { AideDdEntityMdOutput } from './aide-dd-entity.md-output';

@Injectable()
export class AideDdSpellsMdOutput extends AideDdEntityMdOutput<Spell> {
  entityType: EntityType = 'Spell';

  protected ddbMdHelper: DdbMdHelper = this.injector.get(DdbMdHelper);

  constructor(injector: Injector) {
    super(injector);
  }

  protected async getMarkdownContent(entity: Spell): Promise<string> {
    const base = 'sorts.php?vo=';
    const content = parse(entity.textContent);
    for (const anchor of content.querySelectorAll('a')) {
      let href = anchor.getAttribute('href');
      if (href?.startsWith(base)) {
        const id = href.replace(base, '').replace(/-s-/g, 's-');
        const ddbSpellUri = `https://www.dndbeyond.com/spells/${id}`;
        href = await this.ddbMdHelper.uriToMdPath(ddbSpellUri);
        anchor.setAttribute('href', this.ddbMdHelper.escapeUriForLink(href));
      } else {
        anchor.remove();
      }
    }

    content.querySelector('.ref')?.remove();

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
