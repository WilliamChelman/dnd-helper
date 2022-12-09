import { existsSync, promises as fs } from 'fs';
import { minify } from 'html-minifier';
import { Injectable } from 'injection-js';
import path from 'path';
import prettier from 'prettier';

import { ConfigService } from './config.service';
import { ExitCleaner } from './exit-cleaner';

@Injectable()
export class CacheService implements ExitCleaner {
  private firstCall: boolean = true;
  constructor(private configService: ConfigService) {}

  async setInCache(url: string, content: string, options: CacheWriteOptions): Promise<void> {
    if (options.type === 'html') {
      content = prettier.format(content, { parser: 'html' });
      content = minify(content, {
        conservativeCollapse: true,
      });
    }
    const filePath = this.getCachePath(url, options);
    const folderPath = path.dirname(filePath);
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
  }

  async getFromCache(url: string, options: CacheOptions): Promise<string | undefined> {
    // in case the process was stopped abruptly, ensure tmp cache is cleared
    if (this.firstCall) {
      await this.clean();
      this.firstCall = false;
    }
    const filePath = this.getCachePath(url, options);
    if (existsSync(filePath)) {
      return fs.readFile(filePath, 'utf8');
    }

    return undefined;
  }

  async clean(): Promise<void> {
    let tmpCachePath = this.configService.config.cachePath;
    tmpCachePath = path.join(tmpCachePath, '.tmp');
    if (existsSync(tmpCachePath)) {
      await fs.rm(tmpCachePath, { force: true, recursive: true });
    }
  }

  private getCachePath(url: string, options: CacheOptions): string {
    let cachePath = this.configService.config.cachePath;
    if (options.mode === 'temporary') {
      cachePath = path.join(cachePath, '.tmp');
    }
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

export interface CacheOptions {
  mode: 'persistent' | 'temporary';
}

export interface CacheWriteOptions extends CacheOptions {
  type: 'text' | 'html';
}
