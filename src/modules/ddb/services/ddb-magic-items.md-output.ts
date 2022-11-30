import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, LoggerFactory, MagicItem, PrefixService } from '../../core';
import { DefaultMdOutput } from '../../markdown-yaml';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbMagicItemsMdOutput extends DefaultMdOutput<MagicItem> {
  constructor(
    protected loggerFactory: LoggerFactory,
    protected prefixService: PrefixService,
    protected configService: ConfigService,
    protected ddbHelper: DdbHelper
  ) {
    super(loggerFactory, prefixService, configService);
  }

  canHandle(entity: MagicItem): number | undefined {
    return entity.type === 'MagicItem' ? 10 : undefined;
  }

  protected getMarkdownContent(entity: MagicItem): string {
    const content = parse(entity.textContent);

    this.ddbHelper.fixForMarkdown(content);
    this.ddbHelper.fixSimpleImages(content);
    this.ddbHelper.fixLinks(content);

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
