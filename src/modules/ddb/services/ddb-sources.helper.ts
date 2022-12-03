import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';
import { DdbLinkHelper } from './ddb-link.helper';

@Injectable()
export class DdbSourcesHelper {
  constructor(private ddbLinkHelper: DdbLinkHelper) {}

  getSourcePageLinks(sourceUri: string, sourcePageContent: HTMLElement): string[] {
    const toc = sourcePageContent.querySelector('.compendium-toc-full-text');

    return (
      toc
        ?.querySelectorAll('a')
        .map(anchor => this.ddbLinkHelper.getAbsoluteUrl(anchor.getAttribute('href')!, sourceUri))
        .filter(link => !link.includes('#'))
        .filter(link => !link.endsWith('.jpg'))
        .filter(link => !link.endsWith('.png')) ?? []
    );
  }
}
