import { markdownToBlocks } from '@tryfabric/martian';
import { Injectable } from 'injection-js';
import { NodeHtmlMarkdown } from 'node-html-markdown';

import { ConfigService, LoggerFactory, OldMonster, notNil } from '../../core';
import { MonsterProperties } from '../models';
import { PropertiesSchema } from './notion-db.service';
import { NotionDao } from './notion.dao';
import { NotionHelper } from './notion.helper';

@Injectable()
export class NotionMonstersDao extends NotionDao<OldMonster> {
  id: string = 'notion-monsters';

  constructor(configService: ConfigService, notionHelper: NotionHelper, loggerFactory: LoggerFactory) {
    super(configService, notionHelper, loggerFactory.create('NotionMonsterDao'));
  }

  canHandle(entityType: string): number {
    return entityType === 'Monster' ? 10 : 0;
  }

  async getCurrentId(page: OldMonster): Promise<string | undefined> {
    const response = await this.notion.databases.query({
      database_id: this.getDatabaseId(),
      page_size: 1,
      filter: {
        and: [
          {
            property: 'title',
            rich_text: { equals: page.name! },
          },
          { property: MonsterProperties.DATA_SOURCE, select: { equals: page.dataSource! } },
        ],
      },
    });

    return response.results[0]?.id;
  }

  getDatabaseId(): string {
    return this.configService.config.notion?.monstersDbId || '';
  }

  protected getProperties(monster: OldMonster): any {
    return {
      ...this.notionHelper.getTitle(MonsterProperties.NAME, monster.name),
      ...this.notionHelper.getSelect(MonsterProperties.SOURCE, monster.source),
      ...this.notionHelper.getUrl(MonsterProperties.URI, monster.uri),
      ...this.notionHelper.getUrl(MonsterProperties.LINK, monster.link),
      ...this.notionHelper.getMultiSelect(MonsterProperties.TAGS, monster.tags),
      ...this.notionHelper.getSelect(MonsterProperties.CR, monster.challenge),
      ...this.notionHelper.getRichText(MonsterProperties.ID, [monster.id].filter(notNil)),
      ...this.notionHelper.getRichText(MonsterProperties.SOURCE_DETAILS, [monster.sourceDetails].filter(notNil)),
      ...this.notionHelper.getSelect(MonsterProperties.TYPE, monster.type),
      ...this.notionHelper.getSelect(MonsterProperties.SUBTYPE, monster.subtype),
      ...this.notionHelper.getSelect(MonsterProperties.SIZE, monster.size),
      ...this.notionHelper.getSelect(MonsterProperties.ALIGNMENT, monster.alignment),
      ...this.notionHelper.getMultiSelect(MonsterProperties.ENVIRONMENT, monster.environment),
      ...this.notionHelper.getNumber(MonsterProperties.AC, monster.armorClass),
      ...this.notionHelper.getNumber(MonsterProperties.AVG_HP, monster.avgHitPoints),
      ...this.notionHelper.getMultiSelect(MonsterProperties.SENSES, monster.senses),
      ...this.notionHelper.getMultiSelect(MonsterProperties.SAVES, monster.saveProficiencies),
      ...this.notionHelper.getMultiSelect(MonsterProperties.SKILLS, monster.skillProficiencies),
      ...this.notionHelper.getCheckbox(MonsterProperties.LEGENDARY, monster.isLegendary),
      ...this.notionHelper.getCheckbox(MonsterProperties.MYTHIC, monster.isMythic),
      ...this.notionHelper.getCheckbox(MonsterProperties.LEGACY, monster.isLegacy),
      ...this.notionHelper.getCheckbox(MonsterProperties.LAIR, monster.hasLair),
      ...this.notionHelper.getMultiSelect(MonsterProperties.RESISTANCES, monster.resistances),
      ...this.notionHelper.getMultiSelect(MonsterProperties.DAMAGE_IMMUNITIES, monster.damageImmunities),
      ...this.notionHelper.getMultiSelect(MonsterProperties.CONDITION_IMMUNITIES, monster.conditionImmunities),
      ...this.notionHelper.getMultiSelect(MonsterProperties.VULNERABILITIES, monster.vulnerabilities),
      ...this.notionHelper.getMultiSelect(MonsterProperties.LANGUAGES, monster.languages),
      ...this.notionHelper.getMultiSelect(MonsterProperties.MOVEMENT_TYPES, monster.movementTypes),
      ...this.notionHelper.getRichText(MonsterProperties.ALT_NAMES, monster.altNames),
      ...this.notionHelper.getRelation(MonsterProperties.SAME_AS, monster.sameAs),
      ...this.notionHelper.getSelect(MonsterProperties.LANG, monster.lang),
      ...this.notionHelper.getSelect(MonsterProperties.DATA_SOURCE, monster.dataSource),
    };
  }

  protected getIcon(monster: OldMonster) {
    if (!monster.iconLink) return undefined;
    return {
      external: {
        url: monster.iconLink,
      },
    };
  }

  protected getCover(monster: OldMonster) {
    if (!monster.coverLink) return undefined;
    return {
      external: {
        url: monster.coverLink,
      },
    };
  }

  protected getChildren(monster: OldMonster) {
    if (!monster.markdownContent) return [];
    const blocks = markdownToBlocks(monster.markdownContent);
    if (monster.coverLink) {
      blocks.unshift({
        type: 'image',
        image: {
          type: 'external',
          external: {
            url: monster.coverLink,
          },
        },
      });
    }
    return blocks;
  }

  protected getDbId(): string {
    return this.configService.config.notion?.monstersDbId || '';
  }

  protected getSchema(): PropertiesSchema {
    return {
      [MonsterProperties.NAME]: { title: {} },
      [MonsterProperties.ALT_NAMES]: { rich_text: {} },
      [MonsterProperties.ID]: { rich_text: {} },
      [MonsterProperties.TAGS]: { multi_select: {} },
      [MonsterProperties.SOURCE]: { select: {} },
      [MonsterProperties.SOURCE_DETAILS]: { rich_text: {} },
      [MonsterProperties.URI]: { url: {} },
      [MonsterProperties.LINK]: { url: {} },
      [MonsterProperties.CR]: { select: {} },
      [MonsterProperties.TYPE]: { select: {} },
      [MonsterProperties.SUBTYPE]: { select: {} },
      [MonsterProperties.SIZE]: { select: {} },
      [MonsterProperties.ALIGNMENT]: { select: {} },
      [MonsterProperties.ENVIRONMENT]: { multi_select: {} },
      [MonsterProperties.AC]: { number: {} },
      [MonsterProperties.AVG_HP]: { number: {} },
      [MonsterProperties.SENSES]: { multi_select: {} },
      [MonsterProperties.SAVES]: { multi_select: {} },
      [MonsterProperties.SKILLS]: { multi_select: {} },
      [MonsterProperties.LEGENDARY]: { checkbox: {} },
      [MonsterProperties.MYTHIC]: { checkbox: {} },
      [MonsterProperties.LEGACY]: { checkbox: {} },
      [MonsterProperties.LAIR]: { checkbox: {} },
      [MonsterProperties.RESISTANCES]: { multi_select: {} },
      [MonsterProperties.DAMAGE_IMMUNITIES]: { multi_select: {} },
      [MonsterProperties.CONDITION_IMMUNITIES]: { multi_select: {} },
      [MonsterProperties.VULNERABILITIES]: { multi_select: {} },
      [MonsterProperties.LANGUAGES]: { multi_select: {} },
      [MonsterProperties.MOVEMENT_TYPES]: { multi_select: {} },
      [MonsterProperties.DATA_SOURCE]: { select: {} },
      [MonsterProperties.SAME_AS]: { relation: { database_id: this.getDbId(), single_property: {} } } as any,
      [MonsterProperties.LANG]: { select: {} },
    };
  }

  protected getTitle(page: OldMonster): string {
    return page.name!;
  }
}
