import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';
import { uniq } from 'lodash';
import { DdbLinkHelper } from './ddb-link.helper';

@Injectable()
export class DdbSourcesHelper {
  private blacklist: string[] = ['https://www.dndbeyond.com/legacy'];

  constructor(private ddbLinkHelper: DdbLinkHelper) {}

  getSourcePageUrisFromSource(sourceUri: string, sourcePageContent: HTMLElement): string[] {
    return uniq(
      sourcePageContent
        .querySelectorAll('.compendium-toc-blockquote a, .legacy--note a, .compendium-toc-full-text a')
        .map(anchor => this.ddbLinkHelper.getAbsoluteUrl(anchor.getAttribute('href')!, sourceUri))
        .map(uri => uri.split('#')[0])
        .filter(uri => !this.blacklist.includes(uri))
        .filter(uri => (uri.endsWith('.html') ? true : !uri.match(/(\.[a-z]+)$/)))
    );
  }

  isTocPage(content: HTMLElement): boolean {
    return !!content.querySelector('.compendium-toc-full-text');
  }
}
