import { Injectable } from 'injection-js';
import { parse } from 'node-html-parser';

import { ConfigService, LoggerFactory, NewMagicItem, PrefixService } from '../../core';
import { DefaultMdOutput } from '../../markdown-yaml';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbMagicItemsMdOutput extends DefaultMdOutput<NewMagicItem> {
  constructor(
    protected loggerFactory: LoggerFactory,
    protected prefixService: PrefixService,
    protected configService: ConfigService,
    protected ddbHelper: DdbHelper
  ) {
    super(loggerFactory, prefixService, configService);
  }

  canHandle(entity: NewMagicItem): number | undefined {
    return entity.type === 'MagicItem' ? 10 : undefined;
  }

  protected getMarkdownContent(entity: NewMagicItem): string {
    const content = parse(entity.textContent);

    this.ddbHelper.fixForMarkdown(content);
    this.ddbHelper.fixSimpleImages(content);

    // fixing missing whitespace before anchors
    content.querySelectorAll('a').forEach(anchor => {
      const wrapper = parse(`<span> </span>${anchor.outerHTML}`);
      anchor.replaceWith(wrapper);
    });

    return super.getMarkdownContent({ ...entity, textContent: content.outerHTML });
  }
}
