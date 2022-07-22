import { markdownToBlocks } from "@tryfabric/martian";
import { Injectable } from "injection-js";
import { NodeHtmlMarkdown } from "node-html-markdown";

import { ConfigService, Monster } from "../../core";
import { NotionDbService, PropertiesSchema } from "./notion-db.service";
import { NotionHelper } from "./notion.helper";

@Injectable()
export class NotionMonstersService extends NotionDbService<Monster, any> {
  constructor(configService: ConfigService, notionHelper: NotionHelper) {
    super(configService, notionHelper);
  }

  async getCurrentId(page: Monster): Promise<string | undefined> {
    const response = await this.notion.databases.query({
      database_id: this.getDatabaseId(),
      page_size: 1,
      filter: {
        and: [
          {
            property: "title",
            rich_text: { equals: page.name },
          },
          { property: "Data Source", select: { equals: page.dataSource } },
        ],
      },
    });

    return response.results[0]?.id;
  }

  getDatabaseId(): string {
    return this.configService.config.notion.monstersDbId;
  }

  protected getProperties(monster: Monster): any {
    return {
      ...this.notionHelper.getTitle("Name", monster.name),
      ...this.notionHelper.getSelect("Source", monster.source),
      ...this.notionHelper.getUrl("Link", monster.link),
      ...this.notionHelper.getMultiSelect("Tags", monster.tags),
      ...this.notionHelper.getSelect("CR", monster.challenge),
      ...this.notionHelper.getRichText("Source Details", [monster.sourceDetails]),
      ...this.notionHelper.getSelect("Type", monster.type),
      ...this.notionHelper.getSelect("Subtype", monster.subtype),
      ...this.notionHelper.getSelect("Size", monster.size),
      ...this.notionHelper.getSelect("Alignment", monster.alignment),
      ...this.notionHelper.getMultiSelect("Environment", monster.environment),
      ...this.notionHelper.getNumber("AC", monster.armorClass),
      ...this.notionHelper.getNumber("Avg. HP", monster.avgHitPoints),
      ...this.notionHelper.getMultiSelect("Senses", monster.senses),
      ...this.notionHelper.getMultiSelect("Save prof.", monster.saveProficiencies),
      ...this.notionHelper.getMultiSelect("Skill prof.", monster.skillProficiencies),
      ...this.notionHelper.getCheckbox("Legendary", monster.isLegendary),
      ...this.notionHelper.getCheckbox("Mythic", monster.isMythic),
      ...this.notionHelper.getCheckbox("Legacy", monster.isLegacy),
      ...this.notionHelper.getCheckbox("Lair", monster.hasLair),
      ...this.notionHelper.getMultiSelect("Resistances", monster.resistances),
      ...this.notionHelper.getMultiSelect("Dmg. Immunities", monster.damageImmunities),
      ...this.notionHelper.getMultiSelect("Conditions Immunities", monster.conditionImmunities),
      ...this.notionHelper.getMultiSelect("Vulnerabilities", monster.vulnerabilities),
      ...this.notionHelper.getMultiSelect("Languages", monster.languages),
      ...this.notionHelper.getMultiSelect("Movement Types", monster.movementTypes),
      ...this.notionHelper.getRichText("Alt Names", monster.altNames),
      ...this.notionHelper.getRelation("Same as", monster.sameAs),
      ...this.notionHelper.getSelect("Lang", monster.lang),
      ...this.notionHelper.getSelect("Data Source", monster.dataSource),
    };
  }

  protected getIcon(monster: Monster) {
    if (!monster.iconLink) return undefined;
    return {
      external: {
        url: monster.iconLink,
      },
    };
  }

  protected getCover(monster: Monster) {
    if (!monster.coverLink) return undefined;
    return {
      external: {
        url: monster.coverLink,
      },
    };
  }

  protected getChildren(monster: Monster) {
    const md = NodeHtmlMarkdown.translate(monster.htmlContent, { blockElements: ["br"] }, {});
    const blocks = markdownToBlocks(md);
    if (monster.coverLink) {
      blocks.unshift({
        type: "image",
        image: {
          type: "external",
          external: {
            url: monster.coverLink,
          },
        },
      });
    }
    return blocks;
  }

  protected getDbId(): string {
    return this.configService.config.notion.monstersDbId;
  }

  protected getSchema(): PropertiesSchema {
    return {
      Name: { title: {} },
      "Alt Names": { rich_text: {} },
      Tags: { multi_select: {} },
      Source: { select: {} },
      "Source Details": { rich_text: {} },
      Link: { url: {} },
      CR: { select: {} },
      Type: { select: {} },
      Subtype: { select: {} },
      Size: { select: {} },
      Alignment: { select: {} },
      Environment: { multi_select: {} },
      AC: { number: {} },
      "Avg. HP": { number: {} },
      Senses: { multi_select: {} },
      "Save prof.": { multi_select: {} },
      "Skill prof.": { multi_select: {} },
      Legendary: { checkbox: {} },
      Mythic: { checkbox: {} },
      Legacy: { checkbox: {} },
      Lair: { checkbox: {} },
      Resistances: { multi_select: {} },
      "Dmg. Immunities": { multi_select: {} },
      "Conditions Immunities": { multi_select: {} },
      Vulnerabilities: { multi_select: {} },
      Languages: { multi_select: {} },
      "Movement Types": { multi_select: {} },
      "Data Source": { select: {} },
      "Same as": { relation: { database_id: this.getDbId(), single_property: {} } },
      Lang: { select: {} },
    };
  }

  protected getTitle(page: Monster): string {
    return page.name;
  }
}
