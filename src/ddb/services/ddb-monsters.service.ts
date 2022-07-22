import { Injectable } from "injection-js";
import { HTMLElement, parse } from "node-html-parser";

import { HtmlElementHelper, Monster, PageService, PageServiceFactory } from "../../core";
import { notNil } from "../../core";
import { DdbHelper } from "./ddb.helper";

@Injectable()
export class DdbMonstersService {
  private pageService: PageService;

  constructor(pageServiceFactory: PageServiceFactory, private htmlElementHelper: HtmlElementHelper, private ddbHelper: DdbHelper) {
    this.pageService = pageServiceFactory.create({ ...this.ddbHelper.getDefaultPageServiceOptions(), cachePath: "./cache/ddb/monsters" });
  }

  async getPartialMonsters(options?: MonstersFilteringOptions): Promise<Monster[]> {
    let searchPageUrl = new URL("/monsters", this.ddbHelper.basePath).toString();
    if (options?.name) {
      searchPageUrl += `?filter-search=${encodeURIComponent(options.name)}`;
    }
    return await this.ddbHelper.crawlSearchPages<Monster>(searchPageUrl, this.getMonstersFromSearchPage.bind(this), this.pageService);
  }

  private getMonstersFromSearchPage(page: HTMLElement): Monster[] {
    const monsterBlocks = page.querySelectorAll(".listing-body ul > div");
    return monsterBlocks
      .map((block) => {
        const linkAnchor = block.querySelector(".name a:not(.badge-cta)");
        if (!linkAnchor) return undefined;
        const link = new URL(linkAnchor.getAttribute("href")!, this.ddbHelper.basePath).toString();
        const iconStyle = block.querySelector(".monster-icon .image")?.getAttribute("style");
        const badge = block.querySelector(".badge-label")?.innerText.trim();
        const isLegacy = !!badge?.includes("Legacy");
        let name = linkAnchor.innerText.trim();
        if (isLegacy) {
          name += " (Legacy)";
        }
        const subtype = block.querySelector(".monster-type .subtype")?.innerText.trim().replace("(", "").replace(")", "").trim();

        return {
          name,
          isLegacy,
          link,
          iconLink: this.getBackgroundUrlFromStyle(iconStyle),
          challenge: block.querySelector(".monster-challenge")?.innerText.trim(),
          source: block.querySelector(".source")?.innerText.trim(),
          type: block.querySelector(".monster-type .type")?.innerText.trim(),
          subtype: subtype ? capitalizeFirstLetter(subtype) : undefined,
          size: block.querySelector(".monster-size")?.innerText.trim(),
          alignment: block.querySelector(".monster-alignment")?.innerText.trim(),
          isLegendary: !!block.querySelector(".i-legendary-monster"),
          lang: "EN",
          dataSource: "DDB",
        };
      })
      .filter(notNil);
  }

  private getBackgroundUrlFromStyle(style: string | undefined): string | undefined {
    return style?.match(/background-image: url\('(.*)'\);/)?.[1] ?? undefined;
  }

  async completeMonsterWithDetailPage(partialMonster: Monster): Promise<Monster> {
    const monster = { ...partialMonster };
    const page = await this.pageService.getPageHtmlElement(monster.link!);
    const content = page.querySelector(".more-info.details-more-info");
    const imgSrc = page.querySelector(".image img")?.getAttribute("src");
    if (imgSrc) {
      monster.coverLink = new URL(imgSrc, partialMonster.link).toString();
    }
    if (!monster.iconLink) monster.iconLink = monster.coverLink;

    if (!content) return monster;

    const attributes = content.querySelectorAll(".mon-stat-block__attribute");

    attributes.forEach((attribute) => {
      const label = attribute.querySelector(".mon-stat-block__attribute-label")?.innerText.trim();
      const value = attribute.querySelector(".mon-stat-block__attribute-data,.mon-stat-block__attribute-value")?.innerText.trim();
      if (value == null) return;
      if (label?.includes("Hit Points")) {
        const parsed = value?.match(/(\d+)/)?.[1];
        monster.avgHitPoints = parsed ? parseInt(parsed) : undefined;
      }
      if (label?.includes("Armor Class")) {
        const parsed = value?.match(/(\d+)/)?.[1];
        monster.armorClass = parsed ? parseInt(parsed) : undefined;
      }
      if (label?.includes("Speed")) {
        monster.movementTypes = this.getDistanceField(value);
      }
    });
    const tidbits = content.querySelectorAll(".mon-stat-block__tidbit");

    tidbits.forEach((tidbit) => {
      const label = tidbit.querySelector(".mon-stat-block__tidbit-label")?.innerText.trim();
      const value = tidbit.querySelector(".mon-stat-block__tidbit-data")?.innerText.trim();
      if (value == null || label == null) return;

      if (label.includes("Saving Throws")) {
        monster.saveProficiencies = value
          .replace(/[\-\+]\d+/g, "")
          .split(",")
          .map((v) => v.trim());
      }
      if (label.includes("Skills")) {
        monster.skillProficiencies = value
          .replace(/[\-\+]\d+/g, "")
          .split(",")
          .map((v) => v.trim());
      }
      if (label.includes("Damage Immunities")) {
        monster.damageImmunities = this.getDamageField(value);
      }
      if (label.includes("Condition Immunities")) {
        monster.conditionImmunities = value.split(",").map((v) => v.trim());
      }
      if (label.includes("Damage Vulnerabilities")) {
        monster.vulnerabilities = this.getDamageField(value);
      }
      if (label.includes("Damage Resistances")) {
        monster.resistances = this.getDamageField(value);
      }
      if (label.includes("Senses")) {
        monster.senses = this.getDistanceField(value);
      }
      if (label.includes("Languages") && value !== "--") {
        monster.languages = value
          .replace("--", "")
          .split(",")
          .map((v) => v.trim())
          .filter((v) => !v.match(/\s/));
      }
    });
    monster.environment = content.querySelectorAll(".environment-tag").map((env) => env.innerText.trim());
    monster.tags = content.querySelectorAll(".monster-tag").map((env) => env.innerText.trim());
    monster.sourceDetails = content.querySelector(".monster-source")?.innerText.trim();
    monster.isMythic = content
      .querySelectorAll(".mon-stat-block__description-block-heading")
      .some((heading) => heading.innerText.includes("Mythic Actions"));
    this.cleanupContent(content, monster);
    monster.htmlContent = content.outerHTML;
    return monster;
  }

  private cleanupContent(content: HTMLElement, monster: Monster) {
    const links = content.querySelectorAll("a[href]");
    links.forEach((link) => {
      const fullHref = new URL(link.getAttribute("href")!, monster.link).toString();
      link.setAttribute("href", fullHref);
    });
    content.querySelectorAll(".image").forEach((img) => img.remove());

    const title = content.querySelector(".mon-stat-block__name");
    const newTitle = parse(`<h1>${title?.innerText.trim()}</h1>`);
    title?.replaceWith(newTitle);

    content.querySelectorAll(".mon-stat-block__description-block-heading").forEach((h2) => {
      h2.replaceWith(parse(`<h2>${h2.innerText.trim()}</h2>`));
    });

    content.querySelector("footer")?.remove();

    const abilityBlock = content.querySelector(".ability-block");
    if (abilityBlock) {
      const cleanText = (value: string) => value.trim();
      const abilityLabels = abilityBlock
        .querySelectorAll(".ability-block__heading")
        .map((labelBlock) => `<td>${cleanText(labelBlock.innerText)}</td>`)
        .join("\n");
      const abilityValues = abilityBlock
        .querySelectorAll(".ability-block__data")
        .map((valueBlock) => `<td>${cleanText(valueBlock.innerText)}</td>`)
        .join("\n");
      const abilityTable = parse(`
      <table>
        <tbody>
          <tr>${abilityLabels}</tr>
          <tr>${abilityValues}</tr>
        </tbody>
      </table>
    `);
      abilityBlock.replaceWith(abilityTable);
    }

    // fix for https://www.dndbeyond.com/monsters/94512-sibriex, failed to be translated to notion
    const complexBlockquote = content.querySelector("blockquote table")?.parentNode;
    if (complexBlockquote) {
      complexBlockquote.replaceWith(parse(`<div>${complexBlockquote.innerHTML}</div>`));
    }
  }

  private getDamageField(value: string): string[] {
    const specialMatch = /((Bludgeoning|Piercing|Slashing).*)/;
    const special = value.match(specialMatch)?.[1]?.replace(/, /g, " ");
    value = value.replace(specialMatch, "").replace(";", "");
    return [special, ...value.split(",")].map((v) => v?.trim()).filter(notNil);
  }

  private getDistanceField(value: string): string[] {
    return value
      .split(",")
      .map((v) => v.match(/([a-zA-Z]+).*ft\.?/)?.[1]?.trim() ?? "")
      .map(capitalizeFirstLetter);
  }
}

export interface MonstersFilteringOptions {
  name?: string;
}

function capitalizeFirstLetter(v: string) {
  return v.charAt(0).toUpperCase() + v.slice(1);
}
