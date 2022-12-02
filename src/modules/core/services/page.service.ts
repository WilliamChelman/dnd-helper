import consola from 'consola';
import { existsSync, promises as fs } from 'fs';
import { minify } from 'html-minifier';
import { Injectable } from 'injection-js';
import { HTMLElement, parse } from 'node-html-parser';
import path from 'path';
import playwright from 'playwright';
import prettier from 'prettier';
import UserAgent from 'user-agents';

import { ConfigService } from './config.service';

@Injectable()
export class PageServiceFactory {
  private services: PageService[] = [];

  constructor(private configService: ConfigService) {}

  create(options: PageServiceOptions = {}) {
    const service = new PageService(options, this.configService);
    this.services.push(service);
    return service;
  }

  closeAll(): void {
    this.services.forEach(s => s.closeBrowser());
    this.services = [];
  }
}

@Injectable()
export class PageService {
  private browser?: playwright.Browser;
  private context?: playwright.BrowserContext;
  private lastUserAgent?: string;
  private failedUserAgents = new Set<string>();

  constructor(private options: PageServiceOptions, private configService: ConfigService) {}

  async getPageHtmlElement(url: string): Promise<HTMLElement> {
    const cache = await this.getFromCache(url);
    if (cache && !this.options.noCache) {
      return parse(cache);
    }
    consola.log(`Fetching live page ${url}`);
    if (this.lastUserAgent) {
      await this.wait(2);
    }
    const page = await this.getPage(url);
    const html = await page.$eval('html', htmlElement => htmlElement.outerHTML);
    const el = parse(html);
    this.setInCache(url, el);
    await page.close();

    return el;
  }

  closeBrowser(): void {
    this.browser?.close();
  }

  private async getPage(url: string, tryCount: number = 0, useNewContext: boolean = false): Promise<playwright.Page> {
    const context = await this.getContext(useNewContext);
    const page = await context.newPage();
    await page.goto(url);
    if (this.options.validator) {
      const valid = await this.options.validator(page);
      if (!valid) {
        if (this.lastUserAgent) {
          this.failedUserAgents.add(this.lastUserAgent);
        }
        const maxTry = 10;
        if (tryCount < maxTry) {
          const multiplier = 5 + (tryCount * tryCount) / maxTry;
          const waitTime = multiplier * 60_000;
          consola.warn(`Got invalid page trying to reach ${url}, trying again in ${waitTime}ms (${tryCount + 1}/${maxTry})`);
          await page.waitForTimeout(waitTime);
          this.reset();
          return this.getPage(url, tryCount + 1, true);
        } else {
          throw Error(`Failed to get valid page ${url}`);
        }
      }
    }

    return page;
  }

  private async setInCache(url: string, html: HTMLElement): Promise<void> {
    this.options.cleaner?.(html);
    let content = html.outerHTML;
    content = prettier.format(content, { parser: 'html' });
    content = minify(content, {
      conservativeCollapse: true,
    });
    const filePath = this.getCachePath(url);
    const folderPath = path.dirname(filePath);
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
  }

  private async getFromCache(url: string): Promise<string | undefined> {
    url = url.split('#')[0];
    const filePath = this.getCachePath(url);
    if (existsSync(filePath)) {
      return fs.readFile(filePath, 'utf8');
    }

    return undefined;
  }

  private getCachePath(url: string): string {
    const cachePath = this.configService.config.cachePath;
    const parts = url
      .split('/')
      .map((part, index, arr) => {
        if (index === arr.length - 1) {
          return encodeURIComponent(part) + '.html';
        }
        return part;
      })
      .filter(p => !!p);

    return path.join(cachePath, ...parts);
  }

  private reset(): void {
    this.context = undefined;
  }

  private async getBrowser(): Promise<playwright.Browser> {
    if (this.browser) return this.browser;

    this.browser = await playwright.chromium.launch({
      headless: true,
      devtools: false,
      channel: getRandomInArray(['msedge', 'chrome']),
    });

    return this.browser;
  }

  private async getContext(useNewContext: boolean): Promise<playwright.BrowserContext> {
    if (this.context && this.options.cacheContext && !useNewContext) return this.context;
    this.context?.close();
    const browser = await this.getBrowser();
    this.context = await browser.newContext({
      screen: {
        width: 1920,
        height: 1080,
      },
      viewport: {
        width: getRandomInt(1920 / 2, 1920),
        height: getRandomInt(1080 / 2, 1080),
      },
      userAgent: this.getUserAgent(),
    });

    if (this.options.cookies) {
      this.context.addCookies(this.options.cookies);
    }

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

  private async wait(factor: number = 1): Promise<void> {
    const multiplier = 1 + factor / 10;
    const waitTime = getRandomInt(multiplier * 200, multiplier * 1200);
    return new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

export interface PageServiceOptions {
  noCache?: boolean;
  cookies?: Cookies;
  headers?: { [key: string]: string };
  validator?: (page: playwright.Page) => Promise<boolean>;
  cacheContext?: boolean;
  cleaner?: (el: HTMLElement) => void;
}

export type Cookies = Parameters<playwright.BrowserContext['addCookies']>[0];

function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomInArray<T>(arr: T[]): T {
  return arr[getRandomInt(0, arr.length - 1)];
}
