import { Injectable } from "injection-js";
import { HTMLElement } from "node-html-parser";
import { ConfigService, Cookies, PageService, PageServiceOptions } from "../../core";

@Injectable()
export class DdbHelper {
  basePath = "https://www.dndbeyond.com";

  constructor(private configService: ConfigService) {}

  async crawlSearchPages<T>(firstPageUrl: string, parser: (page: HTMLElement) => T[], pageService: PageService): Promise<T[]> {
    const items = [];
    let nextPage = firstPageUrl;
    while (nextPage) {
      const listPage = await pageService.getPageHtmlElement(nextPage);
      items.push(...parser(listPage));
      const nextHref = listPage.querySelector(".b-pagination-item-next a")?.getAttribute("href");
      nextPage = nextHref ? new URL(nextHref, nextPage).toString() : undefined;
    }

    return items;
  }

  getDefaultPageServiceOptions(): PageServiceOptions {
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
}

export interface CrawlSearchResponse<T> {
  items: T[];
  nextPage?: string;
}
