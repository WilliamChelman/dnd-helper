import { Injectable } from "injection-js";
import { HTMLElement } from "node-html-parser";

import { HtmlElementHelper, PageService, PageServiceFactory, Spell } from "../../core";
import { DdbHelper } from "./ddb.helper";

@Injectable()
export class DdbSpellsService {
  private pageService: PageService;

  constructor(pageServiceFactory: PageServiceFactory, private htmlElementHelper: HtmlElementHelper, private ddbHelper: DdbHelper) {
    this.pageService = pageServiceFactory.create({ ...this.ddbHelper.getDefaultPageServiceOptions(), cachePath: "./cache/ddb/spells/" });
  }

  async getSpells(options?: SpellsFilteringOptions): Promise<Spell[]> {
    const spells = [];
    let searchPageUrl = new URL("/spells", this.ddbHelper.basePath).toString();
    if (options?.name) {
      searchPageUrl += `?filter-search=${encodeURIComponent(options.name)}`;
    }
    const links = await this.ddbHelper.crawlSearchPages<string>(searchPageUrl, this.getSpellLinksSearchPage.bind(this), this.pageService);

    for (const link of links) {
      spells.push(await this.getSpellFromDetailPage(link));
    }

    return spells;
  }

  private getSpellLinksSearchPage(page: HTMLElement): string[] {
    const links = page.querySelectorAll("ul.rpgspell-listing > div a");
    return links.map((link) => {
      return new URL(link.getAttribute("href")!, this.ddbHelper.basePath).toString();
    });
  }

  private async getSpellFromDetailPage(url: string): Promise<Spell> {
    const page = await this.pageService.getPageHtmlElement(url);

    const sourceDetails = this.htmlElementHelper.getCleanedInnerText(page, ".source.spell-source");
    let castingTime = this.htmlElementHelper.getCleanedInnerText(page, ".ddb-statblock-item-casting-time .ddb-statblock-item-value");
    const ritual = castingTime.endsWith("Ritual");
    if (ritual) {
      castingTime = castingTime.replace("Ritual", "").trim();
    }

    let duration = this.htmlElementHelper.getCleanedInnerText(page, ".ddb-statblock-item-duration .ddb-statblock-item-value");
    const concentration = duration.startsWith("Concentration");
    if (concentration) {
      duration = duration.replace("Concentration", "").trim();
    }
    let rangeAndArea = this.htmlElementHelper.getCleanedInnerText(page, ".ddb-statblock-item-range-area .ddb-statblock-item-value");
    const areaIcon = page.querySelector(".ddb-statblock-item-range-area .ddb-statblock-item-value i");
    if (areaIcon) {
      const geometry = areaIcon.classNames.split("-").pop();
      rangeAndArea = rangeAndArea.replace(")", `${geometry})`);
    }
    const content = page.querySelector(".more-info-content");
    if (!content) {
      throw new Error("Failed to get spell content");
    }
    const links = content.querySelectorAll("a[href]");
    links.forEach((link) => {
      const fullHref = new URL(link.getAttribute("href")!, url).toString();
      link.setAttribute("href", fullHref);
    });
    const spell: Spell = {
      name: this.htmlElementHelper.getCleanedInnerText(page, "header .page-title"),
      level: this.htmlElementHelper.getCleanedInnerText(page, ".ddb-statblock-item-level .ddb-statblock-item-value"),
      castingTime: castingTime,
      rangeAndArea: rangeAndArea,
      components: this.htmlElementHelper.getCleanedInnerText(page, ".ddb-statblock-item-components .ddb-statblock-item-value"),
      duration: duration,
      school: this.htmlElementHelper.getCleanedInnerText(page, ".ddb-statblock-item-school .ddb-statblock-item-value"),
      attackOrSave: this.htmlElementHelper.getCleanedInnerText(page, ".ddb-statblock-item-attack-save .ddb-statblock-item-value"),
      damageOrEffect: this.htmlElementHelper.getCleanedInnerText(page, ".ddb-statblock-item-damage-effect .ddb-statblock-item-value"),
      htmlContent: content?.outerHTML,
      spellLists: page.querySelectorAll(".tags.available-for .class-tag").map((el) => el.innerText),
      tags: page.querySelectorAll(".tags.spell-tags .spell-tag").map((el) => el.innerText),
      sourceDetails,
      source: sourceDetails.split(",")[0].trim(),
      ritual,
      concentration,
      link: url,
    };

    return spell;
  }
}

export interface SpellsFilteringOptions {
  name?: string;
}
