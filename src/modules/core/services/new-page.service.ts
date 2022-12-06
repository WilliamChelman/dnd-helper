import execa from 'execa';
import CDP from 'chrome-remote-interface';
import consola from 'consola';
import { existsSync, promises as fs } from 'fs';
import { minify } from 'html-minifier';
import { Injectable } from 'injection-js';
import { HTMLElement, parse } from 'node-html-parser';
import path from 'path';
import playwright from 'playwright';
import prettier from 'prettier';

import { ConfigService } from './config.service';

@Injectable()
export class NewPageService {
  private client?: CDP.Client;
  private browserProcess?: execa.ExecaChildProcess;

  constructor(private configService: ConfigService) {}

  async getPageHtmlElement(url: string, options: NewPageServiceOptions): Promise<HTMLElement> {
    url = url.split('#')[0].trim();
    if (!this.configService.config.noCache && !options.noCache) {
      const cache = await this.getFromCache(url);
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
    this.browserProcess?.cancel();
  }

  private async getClient(): Promise<CDP.Client> {
    if (this.client) return this.client;

    await new Promise(resolve => {
      this.browserProcess = execa(
        this.configService.config.webScrapper?.pathToChromeBinary!,
        ['--remote-debugging-port=9222', '--incognito'],
        {}
      );
      this.browserProcess?.stderr?.addListener('data', (message: string) => {
        if (message.includes('DevTools listening')) resolve(undefined);
      });
    });

    this.client = await CDP({});
    const { Page, Network, Runtime } = this.client;
    await Promise.all([await Network.enable({}), await Page.enable(), await Runtime.enable()]);
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
    const html = result.result.value;

    // await Page.close();
    const page = parse(html);

    if (options.validator) {
      const valid = await options.validator(page);
      if (!valid) {
        const maxTry = 10;
        if (tryCount < maxTry) {
          const multiplier = 5 + (tryCount * tryCount) / maxTry;
          const waitTime = multiplier * 10_000;
          consola.warn(`Got invalid page trying to reach ${url}, trying again in ${waitTime}ms (${tryCount + 1}/${maxTry})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return this.getPage(url, options, tryCount + 1);
        } else {
          throw Error(`Failed to get valid page ${url}`);
        }
      }
    }

    return page;
  }

  private async setInCache(url: string, html: HTMLElement, options: NewPageServiceOptions): Promise<void> {
    options.cleaner?.(html);
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
}

export interface NewPageServiceOptions {
  noCache?: boolean;
  cookies?: NewPageCookies;
  headers?: { [key: string]: string };
  validator?: (page: HTMLElement) => Promise<boolean>;
  cacheContext?: boolean;
  cleaner?: (el: HTMLElement) => void;
}

export type NewPageCookies = Parameters<playwright.BrowserContext['addCookies']>[0];

function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomInArray<T>(arr: T[]): T {
  return arr[getRandomInt(0, arr.length - 1)];
}
