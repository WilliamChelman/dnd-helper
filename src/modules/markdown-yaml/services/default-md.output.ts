import consola from 'consola';
import { existsSync, promises as fs } from 'fs';
import { Injectable } from 'injection-js';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import path from 'path';
import prettier from 'prettier';
import yaml from 'yaml';

import { ConfigService, Entity, OutputService } from '../../core';

@Injectable()
export abstract class DefaultMdOutput<T extends Entity = Entity> implements OutputService<T> {
  format: string = 'md';

  constructor(protected configService: ConfigService) {}

  async export(entities: T[]): Promise<string[]> {
    const result: string[] = [];
    for (const entity of entities) {
      result.push(await this.saveOne(entity));
    }
    return result;
  }

  abstract canHandle(entity: T): number | undefined;

  protected async saveOne(entity: T): Promise<string> {
    const basePath = this.getBasePath();
    const filePath = await this.getFilePath(entity, basePath);
    if (!this.configService.config.force && existsSync(filePath)) {
      consola.log(`Skipping ${entity.name} as ${filePath} already exists`);
      return filePath;
    }
    consola.log(`Writing ${entity.name} in ${filePath}`);

    const yamlPart = yaml.stringify({
      ...entity,
      textContent: undefined,
    });
    const lines = ['---', yamlPart, '---', await this.getMarkdownContent(entity)];

    const content = prettier.format(lines.join('\n'), { parser: 'markdown' });

    const folderPath = path.dirname(filePath);
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');

    return filePath;
  }

  protected abstract getFilePath(entity: T, basePath: string): Promise<string>;

  protected getBasePath(): string {
    const config = this.configService.config;
    let basePath = config.markdownYaml?.distPath ?? '';
    if (basePath.startsWith('.')) {
      basePath = path.join(process.cwd(), basePath);
    }
    return basePath;
  }

  protected async getMarkdownContent(entity: T): Promise<string> {
    return NodeHtmlMarkdown.translate(entity.textContent, { blockElements: ['br'] });
  }
}
