import { Injectable } from "injection-js";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { parse, HTMLElement } from "node-html-parser";
import { URL } from "url";

import { AssetsService, EntityDao, LabelsHelper, LoggerFactory, notNil, PageService, PageServiceFactory, Spell } from "../../core";

@Injectable()
export class AideDdSpellsDao implements EntityDao<Spell> {
  id: string = "aide-dd-spells";
  private basePath = "https://www.aidedd.org";
  private pageService: PageService = this.pageFactoryService.create({
    cacheContext: true,
    cachePath: "./cache/aidedd/spells",
  });
  private logger = this.loggerFactory.create("AideDdSpellsDao");

  private altNames: { [name: string]: string[] } = this.assetsService.readJson("aidedd/spells-alt-names.json");

  constructor(
    private pageFactoryService: PageServiceFactory,
    private labelsHelper: LabelsHelper,
    private assetsService: AssetsService,
    private loggerFactory: LoggerFactory
  ) {}

  async getAll(): Promise<Spell[]> {
    const partialSpells = await this.getPartialSpells();
    const spells: Spell[] = [];
    let index = 0;
    for (let spell of partialSpells.slice(0, 1)) {
      this.logger.info(`Processing ${index}/${partialSpells.length - 1} - ${spell.name}`);
      spell = await this.completeSpellWithDetailPage(spell);
      spells.push(spell);
      ++index;
    }
    return spells;
  }

  getByUri(uri: string): Promise<Spell> {
    throw new Error("Method not implemented.");
  }
  save(entity: Spell): Promise<string> {
    throw new Error("Method not implemented.");
  }
  patch(entity: Spell): Promise<string> {
    throw new Error("Method not implemented.");
  }
  canHandle(entityType: string): number {
    throw new Error("Method not implemented.");
  }

  async getPartialSpells(): Promise<Spell[]> {
    const listPageUrl = new URL("/regles/sorts/", this.basePath).toString();
    const listPage = await this.pageService.getPageHtmlElement(listPageUrl);
    const anchors = listPage.querySelectorAll(".content .liste a");
    return anchors.map((anchor) => {
      const name = anchor.innerText.trim();
      const href = anchor.getAttribute("href")!.replace("..", "");
      const uri = new URL(href, listPageUrl).toString();
      return {
        uri,
        id: uri.match(/\?vf=(.*)/)![1],
        entityType: "Spell" as const,
        name: name,
        link: uri,
        dataSource: "AideDD",
        lang: "FR",
      };
    });
  }

  async completeSpellWithDetailPage(partialMonster: Spell): Promise<Spell> {
    const spell = { ...partialMonster };
    const detailPage = await this.pageService.getPageHtmlElement(partialMonster.uri);
    const content = detailPage.querySelector(".bloc");

    if (!content) {
      throw new Error("Failed to find page content");
    }
    const altNames = detailPage
      ?.querySelector(".trad")
      ?.innerText?.match(/\[([^\]]*)\]/g)
      ?.map((v) => v.replace("[", "").replace("]", "").trim())
      .filter((altName) => altName !== spell.name);
    spell.altNames = altNames ?? [];
    if (this.altNames[spell.name!]) {
      spell.altNames.push(...this.altNames[spell.name!]);
    }
    spell.source = this.labelsHelper.getSource(detailPage.querySelector(".source")?.innerText);

    let schoolBlock = content.querySelector(".ecole")?.innerText.trim();
    if (schoolBlock?.includes("(rituel)")) {
      schoolBlock = schoolBlock.replace("(rituel)", "").trim();
      spell.ritual = true;
    }
    const schoolMatch = schoolBlock?.match(/niveau (\d) - (.*)/);

    spell.level = this.labelsHelper.getLevel(schoolMatch?.[1]);
    spell.school = this.labelsHelper.getSchool(schoolMatch?.[2]?.trim());

    content.querySelectorAll("*:not(.description) strong").forEach((el) => {
      let value = el.nextSibling?.innerText.trim();
      if (!value) return;
      if (value.startsWith(":")) {
        value = value.replace(":", "").trim();
      }
      if (el.innerText.includes("Temps d'incantation")) {
        spell.castingTime = value;
      } else if (el.innerText.includes("Portée")) {
        spell.rangeAndArea = value;
      } else if (el.innerText.includes("Durée")) {
        spell.duration = value;
        spell.concentration = spell.duration.includes("concentration");
      } else if (el.innerText.includes("Composantes")) {
        spell.components = value;
      }
    });

    spell.spellLists = content
      .querySelectorAll(".classe")
      .map((el) => this.labelsHelper.getClass(el.innerText.trim()))
      .filter(notNil);

    this.cleanContent(content);
    spell.markdownContent = NodeHtmlMarkdown.translate(content.outerHTML, { blockElements: ["br"] });

    return spell;
  }

  private cleanContent(content: HTMLElement): void {
    content.querySelectorAll("a").forEach((anchor) => {
      anchor.replaceWith(parse(`<span>${anchor.innerText}</span>`));
    });
    content.querySelectorAll(".classe,.source,.ref").forEach((el) => el.remove());
  }
}
