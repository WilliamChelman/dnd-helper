import { markdownToBlocks } from "@tryfabric/martian";
import { Injectable } from "injection-js";
import { NodeHtmlMarkdown } from "node-html-markdown";

import { ConfigService, notNil, Spell } from "../../core";
import { NotionDbService, PropertiesSchema } from "./notion-db.service";
import { NotionHelper } from "./notion.helper";

@Injectable()
export class NotionSpellsService extends NotionDbService<Spell, any> {
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

  protected getDatabaseId(): string {
    return this.configService.config.notion.spellsDbId;
  }

  protected getProperties(spell: Spell): any {
    return {
      ...this.notionHelper.getTitle("Name", spell.name),
      ...this.notionHelper.getRichText("Name (FR)", [spell.nameFr].filter(notNil)),
      ...this.notionHelper.getSelect("Level", spell.level),
      ...this.notionHelper.getSelect("School", spell.school),
      ...this.notionHelper.getRichText("Casting Time", [spell.castingTime].filter(notNil)),
      ...this.notionHelper.getRichText("Range (Area)", [spell.rangeAndArea].filter(notNil)),
      ...this.notionHelper.getRichText("Duration", [spell.duration].filter(notNil)),
      ...this.notionHelper.getRichText("Components", [spell.components].filter(notNil)),
      ...this.notionHelper.getSelect("Source", spell.source),
      ...this.notionHelper.getRichText("Source Details", [spell.sourceDetails].filter(notNil)),
      ...this.notionHelper.getMultiSelect("Spell Lists", spell.spellLists),
      ...this.notionHelper.getCheckbox("Ritual", spell.ritual),
      ...this.notionHelper.getCheckbox("Concentration", spell.concentration),
      ...this.notionHelper.getUrl("Link", spell.link),
      ...this.notionHelper.getRichText("Attack/Save", [spell.attackOrSave].filter(notNil)),
      ...this.notionHelper.getRichText("Damage/Effect", [spell.damageOrEffect].filter(notNil)),
      ...this.notionHelper.getMultiSelect("Tags", spell.tags),
      ...this.notionHelper.getUrl("Link (FR)", spell.linkFr),
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

  protected getDbId(): string {
    return this.configService.config.notion.spellsDbId;
  }

  protected getSchema(): PropertiesSchema {
    return {
      Name: { title: {} },
      "Name (FR)": { rich_text: {} },
      Level: { select: {} },
      School: { select: {} },
      "Casting Time": { rich_text: {} },
      "Range (Area)": { rich_text: {} },
      Components: { rich_text: {} },
      Duration: { rich_text: {} },
      Concentration: { checkbox: {} },
      Ritual: { checkbox: {} },
      "Attack/Save": { rich_text: {} },
      "Damage/Effect": { rich_text: {} },
      Tags: { multi_select: {} },
      "Spell Lists": { multi_select: {} },
      Source: { select: {} },
      "Source Details": { rich_text: {} },
      Link: { url: {} },
      "Link (FR)": { url: {} },
    };
  }

  protected getTitle(page: Spell): string {
    return page.name!;
  }
}
