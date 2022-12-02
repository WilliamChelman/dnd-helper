import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';
import path from 'path';

import { ConfigService, LoggerFactory, PrefixService, Spell } from '../../core';
import { DefaultMdOutput } from '../../markdown-yaml';
import { DdbMdHelper } from './ddb-md.helper';

@Injectable()
export class DdbSpellsMdOutput extends DefaultMdOutput<Spell> {
  constructor(
    protected loggerFactory: LoggerFactory,
    protected prefixService: PrefixService,
    protected configService: ConfigService,
    protected ddbMdHelper: DdbMdHelper
  ) {
    super(loggerFactory, prefixService, configService);
  }

  canHandle(entity: Spell): number | undefined {
    return entity.type === 'Spell' ? 10 : undefined;
  }

  protected async getMarkdownContent(entity: Spell): Promise<string> {
    const content = parse(entity.textContent);

    this.ddbMdHelper.keepOnlyFirstImage(content);
    this.ddbMdHelper.fixImages(content);
    await this.ddbMdHelper.adaptLinks(content, entity.uri);

    const stats = content.querySelectorAll('.ddb-statblock-spell .ddb-statblock-item-value');

    content.querySelector('.ddb-statblock-spell')?.replaceWith(
      parse(`
    <table>
      <tr><th>Level</th><th>Casting Time</th><th>Range/Area</th><th>Components</th></tr>
      <tr>${stats
        .slice(0, 4)
        .map(stat => `<td>${stat.innerText}</td>`)
        .join('')}</tr>
    </table>
    <table>
      <tr><th>Duration</th><th>School</th><th>Attack/Save</th><th>Damage/Effect</th></tr>
      <tr>${stats
        .slice(4, 8)
        .map(stat => `<td>${stat.innerText}</td>`)
        .join('')}</tr>
    </table>
`)
    );
    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }

  protected async getFilePath(entity: Spell, basePath: string): Promise<string> {
    return path.join(basePath, await this.ddbMdHelper.urlToMdUrl(entity.uri, entity.uri)) + '.md';
  }
}
