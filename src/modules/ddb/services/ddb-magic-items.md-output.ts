import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';
import path from 'path';

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

  protected async getMarkdownContent(entity: MagicItem): Promise<string> {
    const content = parse(entity.textContent);

    this.ddbMdHelper.keepOnlyFirstImage(content);
    this.ddbMdHelper.fixImages(content);
    await this.ddbMdHelper.adaptLinks(content, entity.uri);

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }

  protected async getFilePath(entity: MagicItem, basePath: string): Promise<string> {
    return path.join(basePath, await this.ddbMdHelper.urlToMdUrl(entity.uri, entity.uri)) + '.md';
  }
}
