import { Injectable } from "injection-js";
import { PageService, Spell } from "../../core";
import { HTMLElement } from "node-html-parser";
import { join } from "path";

// Most likely broken, will be removed
@Injectable()
export class WikidotSpellsService {
  private basePath = "http://dnd5e.wikidot.com";

  constructor(private pageService: PageService) {}

  async getAllSpells(): Promise<Spell[]> {
    const listPage = await this.pageService.getPageHtmlElement(this.basePath + "/spells");
    const tables = listPage.querySelectorAll("#page-content table");

    const spells = [];
    for (let j = 0; j < tables.length; ++j) {
      const table = tables[j];
      const rows = table.querySelectorAll("tr");
      // yes 1, we skip the first row
      for (let i = 1; i < rows.length; ++i) {
        const row = rows[i];
        const spell = await this.getSpell(row, j.toString());
        if (spell) {
          spells.push(spell);
        }
      }
    }

    return spells;
  }

  private async getSpell(row: HTMLElement, level: string): Promise<Spell | undefined> {
    const cells = row.querySelectorAll("td");
    const spell: any = {
      level: level,
      name: cells[0].textContent,
      school: cells[1].textContent.trim().split(/\s/)[0],
      castingTime: cells[2].textContent,
      rangeAndArea: cells[3].textContent,
      duration: cells[4].textContent,
      components: cells[5].textContent,
    };

    if (spell.name?.includes("(UA)")) {
      return undefined;
    }

    const pageLink = cells[0].querySelector("a")?.getAttribute("href");
    const fullPageLink = join(this.basePath, pageLink ?? "");
    const spellPage = await this.pageService.getPageHtmlElement(fullPageLink);
    const content = spellPage.querySelector("#page-content");
    const paragraphs = spellPage.querySelectorAll("#page-content p");

    spell.source = paragraphs[0].innerText.replace("Source:", "").trim();

    const spellListRegexp = /Spell Lists[\.:]/i;
    const spellsListTag = paragraphs.find((p) => p.innerText.match(spellListRegexp));
    if (spellsListTag) {
      spell.spellLists = spellsListTag.innerText.replace(spellListRegexp, "").split(",").map(this.cleanupText.bind(this));
    }

    if (!content) return spell;

    const componentsNode = content.querySelectorAll("strong")?.find((tag) => tag.innerText.includes("Components"))?.nextSibling;
    if (componentsNode) {
      spell.components = this.cleanupText(componentsNode.innerText);
    }

    const castingTimeNode = content.querySelectorAll("strong")?.find((tag) => tag.innerText.includes("Casting Time"))?.nextSibling;
    if (castingTimeNode) {
      spell.castingTime = this.cleanupText(castingTimeNode.innerText);
    }
    spell.concentration = spell.duration?.includes("Concentration");
    spell.ritual = paragraphs[1].innerText.includes("(ritual)");
    spell.htmlContent = spellPage.querySelector("#page-content")?.outerHTML;
    return spell;
  }

  private cleanupText(text: string): string {
    return text.replace(/\s+/g, " ").trim();
  }
}
