import consola from 'consola';
import { Injectable } from 'injection-js';
import { kebabCase } from 'lodash';
import { HTMLElement } from 'node-html-parser';

import { ConfigService, EntityType, HtmlElementHelper, LabelsHelper, NewPageService, PlayerClass, PlayerSubclass } from '../../core';
import { DdbSearchableEntityInput, SearchType } from './ddb-searchable-entity.input';
import { DdbHelper } from './ddb.helper';

@Injectable()
export class DdbPlayerClassesInput extends DdbSearchableEntityInput<PlayerClass> {
  protected searchType: SearchType = 'onePager';
  protected entityType: EntityType = 'Class';
  protected searchPagePath: string = 'https://www.dndbeyond.com/classes';
  protected linkSelector: string = 'a.listing-card__link';

  constructor(
    pageService: NewPageService,
    htmlElementHelper: HtmlElementHelper,
    ddbHelper: DdbHelper,
    labelsHelper: LabelsHelper,
    configService: ConfigService
  ) {
    super(pageService, htmlElementHelper, ddbHelper, labelsHelper, configService);
  }

  protected async getEntityFromDetailPage(url: string, page: HTMLElement): Promise<PlayerClass> {
    const content = page.querySelector('.content-container');

    const subclasses: PlayerSubclass[] = [];

    const subUris = content
      ?.querySelectorAll('.subitems-list-details h2[id]')
      .map(heading => `https://www.dndbeyond.com/subclasses/${kebabCase(heading.innerText.trim())}`);

    for (const subUri of subUris ?? []) {
      subclasses.push(await this.getSubclass(subUri));
    }

    const playerClass: PlayerClass = {
      uri: url,
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
      name: this.htmlElementHelper.getCleanedInnerText(content, 'h1')!,
      textContent: content.outerHTML,
      dataSource: 'ddb',
      baseClass: this.htmlElementHelper.getCleanedInnerText(content, '.base-class-callout-link'),
      source: this.htmlElementHelper.getCleanedInnerText(content, '.source-description'),
      lang: 'en',
    };

    return subPage;
  }
}
