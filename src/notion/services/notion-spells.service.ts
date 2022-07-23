import { markdownToBlocks } from "@tryfabric/martian";
import { Injectable } from "injection-js";
import { NodeHtmlMarkdown } from "node-html-markdown";

import { ConfigService, notNil, Spell } from "../../core";
import { SpellProperties } from "../models";
import { NotionDbService, PropertiesSchema } from "./notion-db.service";
import { NotionHelper } from "./notion.helper";

@Injectable()
export class NotionSpellsService extends NotionDbService<Spell> {
  private iconMap: { [school: string]: string } = {
    Abjuration: "https://www.dndbeyond.com/attachments/2/707/abjuration.png",
    Conjuration: "https://www.dndbeyond.com/attachments/2/708/conjuration.png",
    Divination: "https://www.dndbeyond.com/attachments/2/709/divination.png",
    Enchantment: "https://www.dndbeyond.com/attachments/2/702/enchantment.png",
    Evocation: "https://www.dndbeyond.com/attachments/2/703/evocation.png",
    Illusion: "https://www.dndbeyond.com/attachments/2/704/illusion.png",
    Necromancy: "https://www.dndbeyond.com/attachments/2/720/necromancy.png",
    Transmutation: "https://www.dndbeyond.com/attachments/2/722/transmutation.png",
  };

  constructor(configService: ConfigService, notionHelper: NotionHelper) {
    super(configService, notionHelper);
  }

  async getByNameAndDataSource(options: Pick<Spell, "name" | "dataSource">): Promise<string | undefined> {
    const response = await this.notion.databases.query({
      database_id: this.getDatabaseId(),
      page_size: 1,
      filter: {
        and: [
          {
            property: SpellProperties.NAME,
            rich_text: { equals: options.name! },
          },
          { property: SpellProperties.DATA_SOURCE, select: { equals: options.dataSource! } },
        ],
      },
    });

    return response.results[0]?.id;
  }

  async getCurrentId(page: Spell): Promise<string | undefined> {
    const response = await this.notion.databases.query({
      database_id: this.getDatabaseId(),
      page_size: 1,
      filter: { property: SpellProperties.URI, url: { equals: page.uri } },
    });

    return response.results[0]?.id;
  }

  getDatabaseId(): string {
    return this.configService.config.notion.spellsDbId;
  }

  protected getProperties(spell: Spell): any {
    return {
      ...this.notionHelper.getTitle(SpellProperties.NAME, spell.name),
      ...this.notionHelper.getSelect(SpellProperties.LEVEL, spell.level),
      ...this.notionHelper.getSelect(SpellProperties.SCHOOL, spell.school),
      ...this.notionHelper.getRichText(SpellProperties.CASTING_TIME, [spell.castingTime].filter(notNil)),
      ...this.notionHelper.getRichText(SpellProperties.RANGE_AREA, [spell.rangeAndArea].filter(notNil)),
      ...this.notionHelper.getRichText(SpellProperties.DURATION, [spell.duration].filter(notNil)),
      ...this.notionHelper.getRichText(SpellProperties.COMPONENTS, [spell.components].filter(notNil)),
      ...this.notionHelper.getSelect(SpellProperties.SOURCE, spell.source),
      ...this.notionHelper.getRichText(SpellProperties.SOURCE_DETAILS, [spell.sourceDetails].filter(notNil)),
      ...this.notionHelper.getMultiSelect(SpellProperties.SPELL_LISTS, spell.spellLists),
      ...this.notionHelper.getCheckbox(SpellProperties.RITUAL, spell.ritual),
      ...this.notionHelper.getCheckbox(SpellProperties.CONCENTRATION, spell.concentration),
      ...this.notionHelper.getRichText(SpellProperties.ATTACK_SAVE, [spell.attackOrSave].filter(notNil)),
      ...this.notionHelper.getRichText(SpellProperties.DAMAGE_EFFECT, [spell.damageOrEffect].filter(notNil)),
      ...this.notionHelper.getMultiSelect(SpellProperties.TAGS, spell.tags),
      ...this.notionHelper.getRelation(SpellProperties.SAME_AS, spell.sameAs),
      ...this.notionHelper.getSelect(SpellProperties.DATA_SOURCE, spell.dataSource),
      ...this.notionHelper.getSelect(SpellProperties.LANG, spell.lang),
      ...this.notionHelper.getRichText(SpellProperties.ID, [spell.id]),
      ...this.notionHelper.getUrl(SpellProperties.URI, spell.uri),
    };
  }

  protected getIcon(spell: Spell) {
    if (!spell.school) return undefined;
    return {
      external: {
        url: this.iconMap[spell.school],
      },
    };
  }

  protected getCover(spell: Spell) {
    return undefined;
  }

  protected getChildren(spell: Spell) {
    if (!spell.htmlContent) return [];
    const md = NodeHtmlMarkdown.translate(spell.htmlContent, { blockElements: ["br"] });
    return markdownToBlocks(md);
  }

  protected getSchema(): PropertiesSchema {
    return {
      [SpellProperties.NAME]: { title: {} },
      [SpellProperties.LEVEL]: { select: {} },
      [SpellProperties.SCHOOL]: { select: {} },
      [SpellProperties.DATA_SOURCE]: { select: {} },
      [SpellProperties.CASTING_TIME]: { rich_text: {} },
      [SpellProperties.RANGE_AREA]: { rich_text: {} },
      [SpellProperties.COMPONENTS]: { rich_text: {} },
      [SpellProperties.DURATION]: { rich_text: {} },
      [SpellProperties.CONCENTRATION]: { checkbox: {} },
      [SpellProperties.RITUAL]: { checkbox: {} },
      [SpellProperties.ATTACK_SAVE]: { rich_text: {} },
      [SpellProperties.DAMAGE_EFFECT]: { rich_text: {} },
      [SpellProperties.ALT_NAMES]: { rich_text: {} },
      [SpellProperties.TAGS]: { multi_select: {} },
      [SpellProperties.SPELL_LISTS]: { multi_select: {} },
      [SpellProperties.SOURCE]: { select: {} },
      [SpellProperties.SOURCE_DETAILS]: { rich_text: {} },
      [SpellProperties.ID]: { rich_text: {} },
      [SpellProperties.URI]: { url: {} },
      [SpellProperties.SAME_AS]: { relation: { database_id: this.getDatabaseId(), single_property: {} } },
      [SpellProperties.LANG]: { select: {} },
    };
  }

  protected getTitle(page: Spell): string {
    return page.name!;
  }
}
