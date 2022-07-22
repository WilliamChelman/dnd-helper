import { Injectable } from "injection-js";
import { URL } from "url";
import { HTMLElement, parse } from "node-html-parser";

import { Monster, PageService, PageServiceFactory } from "../../core";

@Injectable()
export class AideDdMonstersService {
  private basePath = "https://www.aidedd.org";
  private pageService: PageService = this.pageFactoryService.create({
    cacheContext: true,
    cachePath: "./cache/aidedd/monsters",
  });

  constructor(private pageFactoryService: PageServiceFactory) {}

  async getPartialMonsters(): Promise<Monster[]> {
    const listPageUrl = new URL("/regles/liste-monstres/", this.basePath).toString();
    const listPage = await this.pageService.getPageHtmlElement(listPageUrl);
    const anchors = listPage.querySelectorAll(".content .liste a");
    return anchors.map((anchor) => {
      const name = anchor.innerText.trim().replace("(legacy)", "(Legacy)");
      return {
        name: name,
        link: new URL(anchor.getAttribute("href").replace("..", ""), listPageUrl).toString(),
        isLegacy: name.includes("(Legacy)"),
        dataSource: "AideDD",
        lang: "FR",
      };
    });
  }

  async completeMonsterWithDetailPage(partialMonster: Monster): Promise<Monster> {
    const monster = { ...partialMonster };
    const detailPage = await this.pageService.getPageHtmlElement(partialMonster.link);
    const content = detailPage.querySelector(".bloc .jaune");

    monster.source = detailPage.querySelector(".source").innerText;
    const altNames = detailPage
      .querySelector(".trad")
      .innerText.match(/\[([^\]]*)\]/g)
      .map((v) => v.replace("[", "").replace("]", "").trim())
      .filter((altName) => altName !== monster.name);
    monster.altNames = altNames;

    const typeBlock = content.querySelector(".type").innerText.trim();
    const typeMatch = typeBlock.match(/(.*) de taille (.*), (.*)/);
    const subtypeRegexp = /(\(.*\))/;
    const typeAndSubType = typeMatch[1].match(/([^\(]+)( \(.*\))?/);
    monster.subtype = typeMatch[1].match(subtypeRegexp)?.[1].replace("(", "").replace(")", "").trim();
    monster.type = typeAndSubType[1].replace(subtypeRegexp, "").trim();
    monster.size = typeMatch[2];
    monster.alignment = typeMatch[3];

    content.querySelectorAll("strong").forEach((header) => {
      const rawValue = header.nextSibling.innerText.trim();
      if (header.innerText.includes("Classe d'armure")) {
        const value = rawValue.match(/(\d+)/)?.[1];
        if (value) {
          monster.armorClass = parseInt(value);
        }
      } else if (header.innerText.includes("Points de vie")) {
        const value = rawValue.match(/(\d+)/)?.[1];
        if (value) {
          monster.avgHitPoints = parseInt(value);
        }
      } else if (header.innerText.includes("Vitesse")) {
        monster.movementTypes = this.getDistanceField(rawValue);
      } else if (header.innerText.includes("Sens")) {
        monster.senses = this.getDistanceField(rawValue);
      } else if (header.innerText.includes("Résistances aux dégâts")) {
        monster.resistances = this.getDamageField(rawValue);
      } else if (header.innerText.includes("Immunités aux dégâts")) {
        monster.damageImmunities = this.getDamageField(rawValue);
      } else if (header.innerText.includes("Vulnérabilités aux dégâts")) {
        monster.vulnerabilities = this.getDamageField(rawValue);
      } else if (header.innerText.includes("Langues")) {
        monster.languages = rawValue
          .replace("--", "")
          .split(",")
          .map((v) => v.trim())
          .filter((v) => !v.match(/\s/));
      } else if (header.innerText.includes("Jets de sauvegarde")) {
        monster.saveProficiencies = rawValue
          .replace(/[\-\+]\d+/g, "")
          .split(",")
          .map((v) => v.trim());
      } else if (header.innerText.includes("Compétences")) {
        monster.skillProficiencies = rawValue
          .replace(/[\-\+]\d+/g, "")
          .split(",")
          .map((v) => v.trim());
      } else if (header.innerText.includes("Puissance")) {
        monster.challenge = rawValue.match(/([\d\/]+)/)?.[1];
      }
    });
    monster.isLegendary = content.querySelectorAll(".rub").some((rub) => rub.innerText.includes("ACTIONS LÉGENDAIRES"));

    this.cleanContent(content);
    monster.htmlContent = content.outerHTML;

    return monster;
  }

  private cleanContent(content: HTMLElement): void {
    const caracs = content.querySelectorAll(".carac");
    const labels = [];
    const values = [];
    const cleanText = (value: string) => value.trim();
    caracs.forEach((carac) => {
      const label = carac.querySelector("strong").innerText.trim();
      labels.push(`<td>${cleanText(label)}</td>`);
      const value = carac.innerText.replace(label, "").trim();
      values.push(`<td>${cleanText(value)}</td>`);
    });

    const abilityTable = parse(`
      <table>
        <tbody>
          <tr>${labels.join("")}</tr>
          <tr>${values.join("")}</tr>
        </tbody>
      </table>
    `);
    for (let i = 0; i < caracs.length; ++i) {
      if (i === 0) {
        caracs[i].replaceWith(abilityTable);
      } else {
        caracs[i].remove();
      }
    }

    content.querySelectorAll("a").forEach((anchor) => {
      anchor.replaceWith(parse(`<span>${anchor.innerText}</span>`));
    });
  }

  private getDistanceField(value: string): string[] {
    return value.split(",").map((v) => v.match(/([\w\s]+) \d+ m\.?/)?.[1]?.trim() ?? "");
    // .map(capitalizeFirstLetter);
  }

  private getDamageField(value: string): string[] {
    const specialMatch = /((contondant|contondant|tranchant).*)/i;
    const special = value.match(specialMatch)?.[1]?.replace(/, /g, " ");
    value = value.replace(specialMatch, "").replace(";", "");
    return [special, ...value.split(",")].map((v) => v?.trim()).filter((v) => !!v);
  }
}
