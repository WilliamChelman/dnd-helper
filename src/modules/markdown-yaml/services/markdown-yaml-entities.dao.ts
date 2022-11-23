import path, { join } from 'path';
import fs, { existsSync } from 'fs';
import https from 'https';
import http from 'http';
import yaml from 'yaml';
import prettier from 'prettier';
import { Attachment, ConfigService, Entity, EntityDao, LoggerFactory, PrefixService } from '../../core';
import { Injectable } from 'injection-js';

@Injectable()
export class MarkdownYamlEntitiesDao implements EntityDao {
  id: string = 'markdown-yaml-entities';
  logger = this.loggerFactory.create('MarkdownYamlEntitiesDao');

  constructor(private loggerFactory: LoggerFactory, private prefixService: PrefixService, private configService: ConfigService) {}

  getAll(): Promise<Entity[]> {
    throw new Error('Method not implemented.');
  }

  getByUri(uri: string): Promise<Entity> {
    throw new Error('Method not implemented.');
  }

  async save(entity: Entity): Promise<string> {
    const config = this.configService.config;
    const basePath = path.join(process.cwd(), config.markdownYaml?.distPath ?? '', config.markdownYaml?.ddbVaultPath ?? '');
    return await this.saveEntity(entity, basePath);
  }

  private async saveEntity(entity: Entity, basePath: string): Promise<string> {
    this.logger.info(`Writing ${entity.name}`);
    const yamlPart = yaml.stringify({
      ...entity,
      alias: [entity.name, entity.altNames].filter(n => !!n),
      markdownContent: undefined,
      htmlContent: undefined,
      pages: undefined,
    });
    const lines = ['---', yamlPart, '---'];
    if (entity.markdownContent) {
      lines.push(entity.markdownContent);
    }
    const content = prettier.format(lines.join('\n'), { parser: 'markdown' });
    let filePath = path.join(basePath, this.prefixService.toFileName(entity.uri));
    if (!entity.pages || entity.pages.length === 0) {
      filePath += '.md';
    } else {
      filePath = path.join(filePath, 'index.md');
    }
    const folderPath = path.dirname(filePath);
    fs.mkdirSync(folderPath, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');

    for (const attachment of entity.attachments ?? []) {
      await this.downloadAttachment(attachment);
    }

    for (const page of entity.pages ?? []) {
      await this.saveEntity(page, basePath);
    }

    return filePath;
  }

  patch(entity: Entity): Promise<string> {
    throw new Error('Method not implemented.');
  }

  canHandle(entityType: string): number {
    return 10;
  }

  private async downloadAttachment(attachment: Attachment): Promise<void> {
    const destPath = join(process.cwd(), this.configService.config.markdownYaml?.distPath ?? '', attachment.filePath);
    console.log('🚀 ~ MarkdownYamlEntitiesDao ~ destPath', destPath);
    if (existsSync(destPath)) return;
    console.log('doznloading');
    const folderPath = path.dirname(destPath);
    fs.mkdirSync(folderPath, { recursive: true });
    return new Promise(resolve => {
      const file = fs.createWriteStream(destPath);
      (attachment.url.startsWith('https') ? https : http)
        .get(attachment.url, function (response) {
          response.pipe(file);
          file.on('finish', function () {
            file.close(() => resolve()); // close() is async, call cb after close completes.
          });
        })
        .on('error', function (err) {
          // Handle errors
          fs.unlink(destPath, () => resolve()); // Delete the file async. (But we don't check the result)
        });
    });
  }
}
