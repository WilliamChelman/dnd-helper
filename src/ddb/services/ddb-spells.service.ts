import { Injectable } from "injection-js";
import { HTMLElement } from "node-html-parser";

import { ConfigService, Cookies, HtmlElementHelper, PageService, PageServiceFactory, PageServiceOptions, Spell } from "../../core";

@Injectable()
export class DdbSpellsService {
  private basePath = "https://www.dndbeyond.com";
  private pageService: PageService;

  constructor(pageServiceFactory: PageServiceFactory, private htmlElementHelper: HtmlElementHelper, private configService: ConfigService) {
    this.pageService = pageServiceFactory.create(this.getOptions());
  }

  async getSpells(options?: SpellsFilteringOptions): Promise<Spell[]> {
    const spells = [];
    let nextPage = this.basePath + "/spells";
    if (options?.name) {
      nextPage += `?filter-search=${encodeURIComponent(options.name)}`;
    }
    while (nextPage) {
      const listPage = await this.pageService.getPageHtmlElement(nextPage);
      spells.push(...(await this.getSpellsFromListPage(listPage)));
      const nextHref = listPage.querySelector(".b-pagination-item-next a")?.getAttribute("href");
      nextPage = nextHref ? this.basePath + nextHref : undefined;
    }

    return spells;
  }

  private async getSpellsFromListPage(page: HTMLElement): Promise<Spell[]> {
    const spells = [];
    const links = page.querySelectorAll("ul.rpgspell-listing > div a");
    for (const link of links) {
      const url = this.basePath + link.getAttribute("href");
      const spell = await this.getSpellFromDetailPage(url);
      spells.push(spell);
    }
    return spells;
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
    const links = content.querySelectorAll("a[href]");
    links.forEach((link) => {
      const fullHref = this.basePath + link.getAttribute("href");
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
      htmlContent: content.outerHTML,
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

  private getCookies(): Cookies {
    return [
      {
        name: "CobaltSession",
        httpOnly: true,
        secure: true,
        domain: ".dndbeyond.com",
        path: "/",
        value: this.configService.config.ddb.cobaltSession,
      },
    ];
  }

  private getOptions(): PageServiceOptions {
    return {
      cookies: this.getCookies(),
      validator: async (page) => {
        return !(await page.innerText("title")).includes("Access to this page has been denied.");
      },
      cleaner: (el) => {
        el.querySelectorAll("head,script,style,iframe,noscript").forEach((e) => e.remove());
      },
    };
  }
}

export interface SpellsFilteringOptions {
  name?: string;
}
