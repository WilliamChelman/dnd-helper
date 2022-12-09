import CDP from 'chrome-remote-interface';
import consola from 'consola';
import execa from 'execa';
import { minify } from 'html-minifier';
import { Injectable } from 'injection-js';
import { HTMLElement, parse } from 'node-html-parser';
import playwright from 'playwright';
import prettier from 'prettier';

import { CacheOptions, CacheService } from './cache.service';
import { ConfigService } from './config.service';
import { ExitCleaner } from './exit-cleaner';

@Injectable()
export class NewPageService implements ExitCleaner {
  private client?: CDP.Client;
  private browserProcess?: execa.ExecaChildProcess;
  private headless?: boolean = true;

  constructor(private configService: ConfigService, private cacheService: CacheService) {}

  async getPageHtmlElement(url: string, options: NewPageServiceOptions): Promise<HTMLElement> {
    options = { ...options, noCache: options.noCache || this.configService.config.noCache };
    url = url.split('#')[0].trim();
    if (!options.noCache) {
      const cache = await this.getFromCache(url, options);
      if (cache) {
        return parse(cache);
      }
    }
    consola.log(`Fetching live page ${url}`);

    const page = await this.getPage(url, options);

    await this.setInCache(url, page, options);

    return page;
  }

  async close(): Promise<void> {
    this.client?.close();
    this.client = undefined;
    this.browserProcess?.cancel();
    this.browserProcess = undefined;
  }

  async clean(): Promise<void> {
    await this.close();
  }

  private async getClient(): Promise<CDP.Client> {
    if (this.client) return this.client;

    await new Promise(resolve => {
      const args = ['--remote-debugging-port=9222', '--incognito'];
      if (this.headless) {
        args.push('--headless', '--window-size=1280,800');
      }
      consola.log('Launching chrome with args', args);
      this.browserProcess = execa(this.configService.config.webScrapper?.pathToChromeBinary!, args, {});
      this.browserProcess?.stderr?.addListener('data', (message: string) => {
        if (message.includes('DevTools listening')) {
          consola.log('Chrome devtools ready to listen');
          resolve(undefined);
        }
      });
    });
    // TODO better way to detect readiness
    if (this.headless) await new Promise(resolve => setTimeout(resolve, 500));

    this.client = await CDP({});
    const { Page, Network, Runtime } = this.client;
    await Promise.all([await Network.enable({}), await Page.enable(), await Runtime.enable()]);
    await Runtime.evaluate({ expression: `Object.defineProperty(navigator, 'webdriver', {get: () => undefined})` });
    consola.log('Client ready');
    return this.client;
  }

  private async getPage(url: string, options: NewPageServiceOptions, tryCount: number = 0): Promise<HTMLElement> {
    const { Page, Network, Runtime } = await this.getClient();

    for (const cookie of options.cookies ?? []) {
      Network.setCookie(cookie);
    }

    await Page.navigate({ url });
    await (Page as any).loadEventFired();
    // no need to DDOS ddb
    await new Promise(resolve => setTimeout(resolve, 500));
    const result = await Runtime.evaluate({
      expression: 'document.documentElement.outerHTML',
    });

    let html = result.result.value as string;
    if (options.preParseCleanup) html = options.preParseCleanup(html);

    // await Page.close();
    const page = parse(html);

    if (options.validator) {
      const valid = await options.validator(page);
      if (!valid) {
        const maxTry = 10;
        if (tryCount < maxTry) {
          if (this.headless) {
            consola.warn(`Got invalid page trying to reach ${url} in headless mode, switching to normal mode`);
            await this.close();
            this.headless = false;
          } else {
            const multiplier = 5 + (tryCount * tryCount) / maxTry;
            const waitTime = multiplier * 10_000;
            consola.warn(`Got invalid page trying to reach ${url}, trying again in ${waitTime}ms (${tryCount + 1}/${maxTry})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          return this.getPage(url, options, tryCount + 1);
        } else {
          throw Error(`Failed to get valid page ${url}`);
        }
      }
    }

    return page;
  }

  private getCacheOptions(options: NewPageServiceOptions): CacheOptions {
    return { mode: options.noCache ? 'temporary' : 'persistent' };
  }

  private async setInCache(url: string, html: HTMLElement, options: NewPageServiceOptions): Promise<void> {
    options.cleaner?.(html);
    let content = html.outerHTML;
    content = prettier.format(content, { parser: 'html' });
    content = minify(content, {
      conservativeCollapse: true,
    });

    this.cacheService.setInCache(url, content, { ...this.getCacheOptions(options), type: 'html' });
  }

  private async getFromCache(url: string, options: NewPageServiceOptions): Promise<string | undefined> {
    return this.cacheService.getFromCache(url, this.getCacheOptions(options));
  }
}

export interface NewPageServiceOptions {
  noCache?: boolean;
  cookies?: NewPageCookies;
  headers?: { [key: string]: string };
  validator?: (page: HTMLElement) => Promise<boolean>;
  cacheContext?: boolean;
  cleaner?: (el: HTMLElement) => void;
  preParseCleanup?: (html: string) => string;
}

export type NewPageCookies = Parameters<playwright.BrowserContext['addCookies']>[0];
