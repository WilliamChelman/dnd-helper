import { promises as fs } from 'fs';
import { Injectable } from 'injection-js';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import path from 'path';
import prettier from 'prettier';
import yaml from 'yaml';
import consola from 'consola';

import { ConfigService, LoggerFactory, Entity, OutputService, PrefixService } from '../../core';

@Injectable()
export class DefaultMdOutput<T extends Entity = Entity> implements OutputService<T> {
  format: string = 'md';

  constructor(protected loggerFactory: LoggerFactory, protected prefixService: PrefixService, protected configService: ConfigService) {}

  async export(entities: T[]): Promise<string[]> {
    const result: string[] = [];
    for (const entity of entities) {
      result.push(await this.saveOne(entity));
    }
    return result;
  }

  canHandle(entity: T): number | undefined {
    return 0;
  }

  protected async saveOne(entity: T): Promise<string> {
    const basePath = this.getBasePath();

    const yamlPart = yaml.stringify({
      ...entity,
      textContent: undefined,
    });
    const lines = ['---', yamlPart, '---', this.getMarkdownContent(entity)];

    const content = prettier.format(lines.join('\n'), { parser: 'markdown' });
    let filePath = path.join(basePath, this.prefixService.toFileName(entity.uri));
    filePath += '.md';

    consola.log(`Writing ${entity.name} in ${filePath}`);
    const folderPath = path.dirname(filePath);
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');

    return filePath;
  }

  protected getFilePath(entity: T, basePath: string): string {
    let filePath = path.join(basePath, this.prefixService.toFileName(entity.uri));
    filePath += '.md';
    return filePath;
  }

  protected getBasePath(): string {
    const config = this.configService.config;
    let basePath = path.join(config.markdownYaml?.distPath ?? '', config.markdownYaml?.ddbVaultPath ?? '');
    if (basePath.startsWith('.')) {
      basePath = path.join(process.cwd(), basePath);
    }
    return basePath;
  }

  protected getMarkdownContent(entity: T): string {
    return NodeHtmlMarkdown.translate(entity.textContent, { blockElements: ['br'] });
  }
}
