import { Injectable } from "injection-js";
import { URL } from "url";

import { PageService, PageServiceFactory, Spell } from "../../core";

@Injectable()
export class AideDdSpellsService {
  private basePath = "https://www.aidedd.org";
  private pageService: PageService = this.pageFactoryService.create({
    cacheContext: true,
  });

  constructor(private pageFactoryService: PageServiceFactory) {}

  async getFrenchData(spellName: string): Promise<Spell | undefined> {
    spellName = spellName.replace(/\W/g, "-").toLowerCase();
    const url = this.basePath + `/dnd/sorts.php?vo=${spellName}`;

    const listPage = await this.pageService.getPageHtmlElement(url);
    const frenchLink = listPage.querySelector(".trad a");
    if (!frenchLink) {
      return undefined;
    }
    const href = frenchLink.getAttribute("href");
    const frenchUrl = new URL(href, url).toString();
    return {
      nameFr: frenchLink.innerText,
      linkFr: frenchUrl,
    };
  }
}
