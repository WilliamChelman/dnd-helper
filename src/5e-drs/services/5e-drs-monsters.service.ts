import { Injectable } from "injection-js";
import { HTMLElement } from "node-html-parser";
import { URL } from "url";
import { parse } from "yaml";

import { LabelsHelper, Monster, PageService, PageServiceFactory } from "../../core";
import { notNil } from "../../core/utils";

@Injectable()
export class DrsMonstersService {
  private basePath = "https://5e-drs.fr";
  private pageService: PageService = this.pageFactoryService.create({
    cacheContext: true,
    cachePath: "./cache/5e-drs/monsters",
  });

  constructor(private pageFactoryService: PageServiceFactory, private labelsHelper: LabelsHelper) {}

  async getPartialMonsters(): Promise<Monster[]> {
    const items = [];
    let nextPage = new URL("/bestiaire/", this.basePath).toString();
    let listPage = await this.pageService.getPageHtmlElement(nextPage);
    const pageNumbers = listPage.querySelectorAll(".v-pagination li").map((li) => parseInt(li.innerText.trim()));
    const maxPage = Math.max(...pageNumbers.filter((n) => !isNaN(n)));

    for (let i = 1; i <= maxPage; ++i) {
      nextPage = nextPage.split("?")[0];
      nextPage += `?page=${i}`;
      listPage = await this.pageService.getPageHtmlElement(nextPage);
      items.push(...this.getPartialMonstersFromOneSearchPage(listPage));
    }

    return items;
  }

  private getPartialMonstersFromOneSearchPage(searchPage: HTMLElement): Monster[] {
    const rows = searchPage.querySelectorAll(".v-data-table__wrapper tbody tr");
    return rows
      .map((row) => {
        const anchor = row.querySelector("td:nth-child(3) a");
        if (!anchor) return undefined;
        const uri = new URL(anchor.getAttribute("href") as string, this.basePath).toString();
        return {
          id: uri
            .split("/")
            .filter((v) => !!v)
            .pop()!,
          name: this.labelsHelper.getName(anchor.innerText.trim())!,
          uri,
          entityType: "Monster" as const,
          link: uri,
          dataSource: "5eDrs",
          lang: "FR",
        };
      })
      .filter(notNil);
  }

  async completeMonsterWithDetailPage(partialMonster: Monster): Promise<Monster> {
    const monster = { ...partialMonster };
    const detailPage = await this.pageService.getPageHtmlElement(partialMonster.link as string);

    const metadata = await this.getGithubMetadata(partialMonster.link as string);
    monster.type = metadata.type;
    monster.subtype = metadata.subtype;
    monster.languages = metadata.languages?.map((lang) => lang.replace(/,/g, ""));
    monster.source = this.labelsHelper.getSource(metadata.source);
    monster.sourceDetails = metadata.source_page ? `pg. ${metadata.source_page}` : undefined;
    monster.damageImmunities = metadata.damageTypeImmunities;
    monster.resistances = metadata.damageTypeResistances;
    monster.conditionImmunities = metadata.conditionImmunities;
    monster.senses = Object.keys(metadata.senses ?? {}).filter((s) => !s.startsWith("custom"));
    monster.movementTypes = Object.keys(metadata.movement ?? {}).filter((m) => m !== "walk");
    monster.skillProficiencies = metadata.skills?.map((skill) => skill.name);
    monster.saveProficiencies = metadata.savingThrows;
    monster.challenge = metadata.challenge;
    if (monster.challenge === "0.125") monster.challenge = "1/8";
    if (monster.challenge === "0.25") monster.challenge = "1/4";
    if (monster.challenge === "0.5") monster.challenge = "1/2";
    monster.alignment = metadata.alignment;
    monster.size = metadata.size;
    monster.environment = [];
    if (metadata.dungeonTypes) {
      monster.environment.push(...metadata.dungeonTypes);
    }
    if (metadata.environments) {
      monster.environment.push(...metadata.environments);
    }

    const content = detailPage.querySelector(".page.content");
    if (content) {
      monster.isLegendary = content.innerText.includes("Actions légendaires");
      const armorClassRaw = content.querySelector(".monster-armor-class")?.innerText?.match(/(\d+)/)?.[1];
      monster.armorClass = armorClassRaw ? parseInt(armorClassRaw) : undefined;
      const hitPointsRaw = content.querySelector(".monster-hit-points")?.innerText?.match(/Points de vie (\d+)/)?.[1];
      monster.avgHitPoints = hitPointsRaw ? parseInt(hitPointsRaw) : undefined;
      this.cleanContent(content);
      monster.htmlContent = content.outerHTML;
    }

    return monster;
  }

  private cleanContent(content: HTMLElement): void {
    const abilityBlock = content.querySelector(".monster-ability-scores");
    if (abilityBlock) {
      const cleanText = (value: string) => value.trim();
      const abilityLabels = abilityBlock
        .querySelectorAll(".ability-label")
        .map((labelBlock) => `<td>${cleanText(labelBlock.innerText)}</td>`)
        .join("\n");
      const abilityValues = abilityBlock
        .querySelectorAll(".ability-score")
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

    content.querySelectorAll("a").forEach((anchor) => {
      const href = anchor.getAttribute("href");
      anchor.setAttribute("href", new URL(href as string, this.basePath).toString());
    });
  }

  private async getGithubMetadata(detailPageUrl: string): Promise<GithubMetadata> {
    const monsterId = detailPageUrl
      .split("/")
      .filter((p) => !!p)
      .pop();
    const githubPage = await this.pageService.getPageHtmlElement(
      `https://raw.githubusercontent.com/em-squared/5e-drs/master/docs/bestiaire/${monsterId}/README.md`
    );
    if (githubPage.innerText.includes("404: Not Found")) {
      throw new Error("github readme not found");
    }
    const githubMd = githubPage.querySelector("pre")?.innerText;
    const lines = githubMd?.split("\n") ?? [];
    let start, end;
    for (let i = 0; i < lines.length; ++i) {
      if (lines[i].startsWith("---")) {
        if (start == null) start = i;
        else {
          end = i;
          break;
        }
      }
    }
    const yamlPart = lines.slice(start, end).join("\n");
    return parse(yamlPart);
  }
}

export interface GithubMetadata {
  title: string;
  type: string;
  subtype: string;
  size: string;
  alignment: string;
  challenge: string;
  hitDiceCount: number;
  abilityScores: AbilityScores;
  savingThrows: string[];
  ac: AC;
  skills: Skill[];
  movement: Movement;
  senses: Senses;
  conditionImmunities: string[];
  damageTypeResistances: string[];
  damageTypeImmunities: string[];
  languages: string[];
  telepathy: number;
  source: string;
  source_page: number;
  dungeonTypes?: string[];
  environments?: string[];
}

export interface AbilityScores {
  for: number;
  dex: number;
  con: number;
  int: number;
  sag: number;
  cha: number;
}

export interface AC {
  armorType: string;
  value: number;
}

export interface Movement {
  walk: number;
  burrow: number;
  climb: number;
  fly: number;
}

export interface Senses {
  darkvision: number;
  truesight: number;
}

export interface Skill {
  name: string;
  isExpert?: boolean;
}
