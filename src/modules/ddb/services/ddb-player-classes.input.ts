import consola from 'consola';
import { Injectable, Injector } from 'injection-js';
import { kebabCase } from 'lodash';

import { EntityType, PlayerClass, PlayerSubclass } from '../../core';
import { DdbSearchableEntityInput, SearchType } from './ddb-searchable-entity.input';

@Injectable()
export class DdbPlayerClassesInput extends DdbSearchableEntityInput<PlayerClass | PlayerSubclass> {
  protected searchType: SearchType = 'onePager';
  protected entityType: EntityType[] = ['Class', 'Subclass'];
  protected searchPagePath: string = 'https://www.dndbeyond.com/classes';
  protected linkSelector: string = 'a.listing-card__link';

  constructor(injector: Injector) {
    super(injector);
  }

  protected async getEntityFromDetailPage(uri: string): Promise<PlayerClass | PlayerSubclass> {
    const page = await this.pageService.getPageHtmlElement(uri, this.ddbHelper.getDefaultPageServiceOptions());

    if (this.ddbHelper.getType(uri) === 'Subclass') return this.getSubclass(uri);
    const content = page.querySelector('.content-container');

    const subclasses: PlayerSubclass[] = [];

    const subUris = content
      ?.querySelectorAll('.subitems-list-details h2[id]')
      .map(heading => `https://www.dndbeyond.com/subclasses/${kebabCase(heading.innerText.trim())}`);

    for (const subUri of subUris ?? []) {
      subclasses.push(await this.getSubclass(subUri));
    }

    const playerClass: PlayerClass = {
      uri: uri,
      type: 'Class' as const,
      name: this.htmlElementHelper.getCleanedInnerText(page, 'header .page-title')!,
      textContent: content?.outerHTML ?? '',
      dataSource: 'ddb',
      lang: 'en',
      subclasses,
    };

    return playerClass;
  }

  private async getSubclass(url: string): Promise<PlayerSubclass> {
    const page = await this.pageService.getPageHtmlElement(url, this.ddbHelper.getDefaultPageServiceOptions());

    const content = page.querySelector('.container');
    if (!content) {
      consola.error(url);
      throw new Error('Failed to get subclass content');
    }

    const subPage: PlayerSubclass = {
      uri: url,
      type: 'Subclass' as const,
      name: this.htmlElementHelper.getCleanedInnerText(page, 'h1.page-title')!,
      textContent: content.outerHTML,
      dataSource: 'ddb',
      baseClass: this.htmlElementHelper.getCleanedInnerText(content, '.base-class-callout-link'),
      baseClassUri: content.querySelector('.base-class-callout-link')?.getAttribute('href'),
      source: this.htmlElementHelper.getCleanedInnerText(content, '.source-description'),
      lang: 'en',
    };

    return subPage;
  }
}
