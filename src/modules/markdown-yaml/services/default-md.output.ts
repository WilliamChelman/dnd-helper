import consola from 'consola';
import { existsSync, promises as fs } from 'fs';
import { Injectable } from 'injection-js';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { camelCase } from 'lodash';
import path from 'path';
import prettier from 'prettier';
import sanitizeFilename from 'sanitize-filename';
import yaml from 'yaml';

import { ConfigService, Entity, manyToArray, OutputService } from '../../core';

@Injectable()
export abstract class DefaultMdOutput<T extends Entity = Entity> implements OutputService<T> {
  format: string = 'md';
  protected additionalTagFields: AdditionalTagFields<T>[] = [];

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
    if (!(await this.canBeSaved(entity))) {
      consola.log(`Skipping ${entity.name} because it cannot be saved`);
      return filePath;
    }

    consola.log(`Writing ${entity.name} in ${filePath}`);

    const yamlPart = yaml.stringify({
      ...entity,
      tags: this.getTags(entity),
      textContent: undefined,
    });
    const lines = ['---', yamlPart, '---', await this.getMarkdownContent(entity)];

    const content = prettier.format(lines.join('\n'), { parser: 'markdown' });

    const folderPath = path.dirname(filePath);
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');

    return filePath;
  }

  protected async getFilePath(entity: T, basePath: string): Promise<string> {
    return path.join(await this.getFolderPath(entity, basePath), sanitizeFilename(entity.name, { replacement: ' ' })) + '.md';
  }

  protected async getFolderPath(entity: T, basePath: string): Promise<string> {
    const folder = this.configService.config.markdownYaml?.folderEntityTypeMap[entity.type];
    if (!folder) {
      throw new Error(`Failed to find related folder for entity type ${entity.type}`);
    }
    return path.join(basePath, folder);
  }

  protected async canBeSaved(entity: T): Promise<boolean> {
    return true;
  }

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

  protected getTags(entity: T): string[] {
    const tags = entity.tags?.map(tag => `${camelCase(entity.type)}/tags/${camelCase(tag)}`) ?? [];
    tags.push(camelCase(entity.type));

    this.additionalTagFields.forEach(field => {
      const [actualField, renamedField] = manyToArray(field);
      manyToArray(entity[actualField as keyof T]).forEach((value: any) => {
        if (typeof value === 'boolean') value = value ? 'yes' : 'no';
        value = value.toString();
        if (!value.trim()) return;
        const parts = [entity.type, renamedField ?? actualField, value] as string[];

        tags.push(
          parts
            .map(part =>
              part
                .split('/')
                .map(p => camelCase(p))
                .join('-')
            )
            .join('/')
        );
      });
    });

    return tags.sort();
  }
}

export type AdditionalTagFields<T> = keyof T | [keyof T, string];
