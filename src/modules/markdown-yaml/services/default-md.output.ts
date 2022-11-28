import fs from 'fs';
import { Injectable } from 'injection-js';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import path from 'path';
import prettier from 'prettier';
import yaml from 'yaml';

import { ConfigService, LoggerFactory, NewEntity, OutputService, PrefixService } from '../../core';

@Injectable()
export class DefaultMdOutput<T extends NewEntity = NewEntity> implements OutputService<T> {
  format: string = 'md';

  protected logger = this.loggerFactory.create('MarkdownYamlEntitiesDao');

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
    const config = this.configService.config;
    const basePath = path.join(process.cwd(), config.markdownYaml?.distPath ?? '', config.markdownYaml?.ddbVaultPath ?? '');

    this.logger.info(`Writing ${entity.name}`);
    const yamlPart = yaml.stringify({
      ...entity,
      textContent: undefined,
    });
    const lines = ['---', yamlPart, '---', this.getMarkdownContent(entity)];

    const content = prettier.format(lines.join('\n'), { parser: 'markdown' });
    let filePath = path.join(basePath, this.prefixService.toFileName(entity.uri));
    filePath += '.md';

    const folderPath = path.dirname(filePath);
    fs.mkdirSync(folderPath, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');

    return filePath;
  }

  protected getMarkdownContent(entity: T): string {
    return NodeHtmlMarkdown.translate(entity.textContent, { blockElements: ['br'] });
  }
}
