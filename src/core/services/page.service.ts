import playwright from "playwright";
import fs from "fs";
import path from "path";
import { Injectable } from "injection-js";
import { parse, HTMLElement } from "node-html-parser";
import UserAgent from "user-agents";
import { LoggerFactory } from "./logger.factory";

@Injectable()
export class PageServiceFactory {
  private services: PageService[] = [];

  constructor(private loggerFactory: LoggerFactory) {}

  create(options: PageServiceOptions = {}) {
    const service = new PageService(options, this.loggerFactory);
    this.services.push(service);
    return service;
  }

  closeAll(): void {
    this.services.forEach((s) => s.closeBrowser());
    this.services = [];
  }
}

@Injectable()
export class PageService {
  private browser?: playwright.Browser;
  private context?: playwright.BrowserContext;
  private lastUserAgent?: string;
  private failedUserAgents = new Set<string>();
  private logger = this.loggerFactory.create("PageService");

  constructor(private options: PageServiceOptions, private loggerFactory: LoggerFactory) {}

  async getPageHtmlElement(url: string): Promise<HTMLElement> {
    this.logger.debug("Fetching page", { url });
    const cache = this.getFromCache(url);
    if (cache && !this.options.noCache) {
      return parse(cache);
    }
    const page = await this.getPage(url);
    const html = await page.$eval("html", (htmlElement) => htmlElement.outerHTML);
    const el = parse(html);
    this.options.cleaner?.(el);
    this.setInCache(url, el.outerHTML);
    await page.close();

    return el;
  }

  closeBrowser(): void {
    this.browser?.close();
  }

  private async getPage(url: string, tryCount: number = 0): Promise<playwright.Page> {
    const context = await this.getContext();
    const page = await context.newPage();
    await page.goto(url);
    if (this.options.validator) {
      const valid = await this.options.validator(page);
      if (!valid) {
        await page.waitForTimeout(getRandomInt(200, 1200));
        if (this.lastUserAgent) {
          this.failedUserAgents.add(this.lastUserAgent);
        }
        if (tryCount < 10) {
          this.logger.warn(`Got invalid page, trying again ${tryCount + 1}/10`);
          this.reset();
          return this.getPage(url, tryCount + 1);
        } else {
          throw Error(`Failed to get valid page ${url}`);
        }
      }
    }

    return page;
  }

  private setInCache(url: string, content: string): void {
    const filePath = this.getCachePath(url);
    const folderPath = path.dirname(filePath);
    fs.mkdirSync(folderPath, { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  }

  private getFromCache(url: string): string | undefined {
    const filePath = this.getCachePath(url);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf8");
    }

    return undefined;
  }

  private getCachePath(url: string): string {
    const cachePath = this.options.cachePath ?? "./cache/";
    return path.join(cachePath, encodeURIComponent(url) + ".html");
  }

  private reset(): void {
    this.context = undefined;
  }

  private async getBrowser(): Promise<playwright.Browser> {
    if (this.browser) return this.browser;
    this.browser = await playwright.chromium.launch({
      headless: true,
    });

    return this.browser;
  }

  private async getContext(): Promise<playwright.BrowserContext> {
    if (this.context && this.options.cacheContext) return this.context;
    this.context?.close();
    const browser = await this.getBrowser();
    this.context = await browser.newContext();
    if (this.options.cookies) {
      this.context.addCookies(this.options.cookies);
    }

    let headers = this.options.headers ?? {};
    headers = { ...headers, "user-agent": this.getUserAgent() };
    this.context.setExtraHTTPHeaders(headers);
    return this.context;
  }

  private getUserAgent(): string {
    let userAgent;
    let count = 0;
    do {
      userAgent = new UserAgent().toString();
      ++count;
      if (count >= 100) {
        this.failedUserAgents.clear();
      }
    } while (this.failedUserAgents.has(userAgent));
    this.lastUserAgent = userAgent;
    return userAgent;
  }
}

export interface PageServiceOptions {
  noCache?: boolean;
  cookies?: Cookies;
  headers?: { [key: string]: string };
  validator?: (page: playwright.Page) => Promise<boolean>;
  cacheContext?: boolean;
  cleaner?: (el: HTMLElement) => void;
  cachePath?: string;
}

export type Cookies = Parameters<playwright.BrowserContext["addCookies"]>[0];

function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
