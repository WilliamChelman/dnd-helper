import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, LoggerFactory, MagicItem, PrefixService } from '../../core';
import { DefaultMdOutput } from '../../markdown-yaml';
import { DdbMdHelper } from './ddb-md.helper';

@Injectable()
export class DdbMagicItemsMdOutput extends DefaultMdOutput<MagicItem> {
  constructor(
    protected loggerFactory: LoggerFactory,
    protected prefixService: PrefixService,
    protected configService: ConfigService,
    protected ddbMdHelper: DdbMdHelper
  ) {
    super(loggerFactory, prefixService, configService);
  }

  canHandle(entity: MagicItem): number | undefined {
    return entity.type === 'MagicItem' ? 10 : undefined;
  }

  protected getMarkdownContent(entity: MagicItem): string {
    const content = parse(entity.textContent);

    this.ddbMdHelper.keepOnlyFirstImage(content);
    this.ddbMdHelper.fixImages(content);
    this.ddbMdHelper.adaptLinks(content, entity.uri);

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
