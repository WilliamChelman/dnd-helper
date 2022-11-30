import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, LoggerFactory, MagicItem, Monster, PrefixService } from '../../core';
import { DefaultMdOutput } from '../../markdown-yaml';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbMonstersMdOutput extends DefaultMdOutput<Monster> {
  constructor(
    protected loggerFactory: LoggerFactory,
    protected prefixService: PrefixService,
    protected configService: ConfigService,
    protected ddbHelper: DdbHelper
  ) {
    super(loggerFactory, prefixService, configService);
  }

  canHandle(entity: Monster): number | undefined {
    return entity.type === 'Monster' ? 10 : undefined;
  }

  protected getMarkdownContent(entity: Monster): string {
    const content = parse(entity.textContent);

    const links = content.querySelectorAll('a[href]');
    links.forEach(link => {
      const fullHref = new URL(link.getAttribute('href')!, entity.uri).toString();
      link.setAttribute('href', fullHref);
    });
    // content.querySelectorAll('.image').forEach(img => img.remove());

    const title = content.querySelector('.mon-stat-block__name');
    const newTitle = parse(`<h1>${title?.innerText.trim()}</h1>`);
    title?.replaceWith(newTitle);

    content.querySelectorAll('.mon-stat-block__description-block-heading').forEach(h2 => {
      h2.replaceWith(parse(`<h2>${h2.innerText.trim()}</h2>`));
    });

    content.querySelector('footer')?.remove();

    const abilityBlock = content.querySelector('.ability-block');
    if (abilityBlock) {
      const cleanText = (value: string) => value.trim();
      const abilityLabels = abilityBlock
        .querySelectorAll('.ability-block__heading')
        .map(labelBlock => `<td>${cleanText(labelBlock.innerText)}</td>`)
        .join('\n');
      const abilityValues = abilityBlock
        .querySelectorAll('.ability-block__data')
        .map(valueBlock => `<td>${cleanText(valueBlock.innerText)}</td>`)
        .join('\n');
      const abilityTable = parse(`
      <table>
        <tbody>
          <tr>${abilityLabels}</tr>
          <tr>${abilityValues}</tr>
        </tbody>
      </table>
    `);
      abilityBlock.replaceWith(abilityTable);
    }

    // fix for https://www.dndbeyond.com/monsters/94512-sibriex, failed to be translated to notion
    const complexBlockquote = content.querySelector('blockquote table')?.parentNode;
    if (complexBlockquote) {
      complexBlockquote.replaceWith(parse(`<div>${complexBlockquote.innerHTML}</div>`));
    }

    this.ddbHelper.fixLinks(content);
    this.ddbHelper.fixSimpleImages(content);
    this.ddbHelper.fixImages(content);

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
