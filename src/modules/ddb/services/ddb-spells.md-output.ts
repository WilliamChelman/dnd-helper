import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, LoggerFactory, MagicItem, Spell, PrefixService } from '../../core';
import { DefaultMdOutput } from '../../markdown-yaml';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbSpellsMdOutput extends DefaultMdOutput<Spell> {
  constructor(
    protected loggerFactory: LoggerFactory,
    protected prefixService: PrefixService,
    protected configService: ConfigService,
    protected ddbHelper: DdbHelper
  ) {
    super(loggerFactory, prefixService, configService);
  }

  canHandle(entity: Spell): number | undefined {
    return entity.type === 'Spell' ? 10 : undefined;
  }

  protected getMarkdownContent(entity: Spell): string {
    const content = parse(entity.textContent);

    this.ddbHelper.fixSimpleImages(content);

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
