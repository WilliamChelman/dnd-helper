import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';
import { uniq } from 'lodash';
import { DdbLinkHelper } from './ddb-link.helper';

@Injectable()
export class DdbSourcesHelper {
  constructor(private ddbLinkHelper: DdbLinkHelper) {}

  getSourcePageLinks(sourceUri: string, sourcePageContent: HTMLElement): string[] {
    return uniq(
      sourcePageContent
        .querySelectorAll('.compendium-toc-full-text a')
        .map(anchor => this.ddbLinkHelper.getAbsoluteUrl(anchor.getAttribute('href')!, sourceUri))
        .map(link => link.split('#')[0])
        .filter(link => !link.endsWith('.jpg'))
        .filter(link => !link.endsWith('.png'))
    );
  }
}
