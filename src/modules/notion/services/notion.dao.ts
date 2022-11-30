import { Client } from '@notionhq/client';
import {
  CreatePageParameters,
  GetPageResponse,
  QueryDatabaseResponse,
  UpdateDatabaseParameters,
} from '@notionhq/client/build/src/api-endpoints';
import { Injectable } from 'injection-js';
import { Logger } from 'winston';
import { produce } from 'immer';

import { ConfigService, OldEntity, EntityDao, LoggerFactory } from '../../core';
import { NotionHelper } from './notion.helper';

@Injectable()
export abstract class NotionDao<T extends OldEntity> implements EntityDao<T> {
  notion = new Client({
    auth: this.configService.config.notion?.auth,
  });

  abstract id: string;
  private isInitialized: boolean = false;

  constructor(protected configService: ConfigService, protected notionHelper: NotionHelper, protected logger: Logger) {}

  getAll(): Promise<T[]> {
    throw new Error('not implemented');
  }

  getByUri(uri: string): Promise<T> {
    // TODO
    throw new Error('not implemented');
  }

  async save(entity: T): Promise<string> {
    await this.initSchema();
    return this.addPage(entity);
  }

  async patch(entity: T): Promise<string> {
    await this.initSchema();
    const response = await this.notion.databases.query({
      database_id: this.getDatabaseId(),
      page_size: 1,
      filter: { property: 'URI', url: { equals: entity.uri } },
    });

    const pageId = response.results[0]?.id;

    const properties = this.getProperties(entity);

    return (
      await this.notion.pages.update({
        page_id: pageId,
        properties,
      })
    ).id;
  }
  abstract canHandle(entityType: string): number;

  async initSchema(): Promise<void> {
    if (this.isInitialized) return;
    const db = await this.notion.databases.retrieve({ database_id: this.getDatabaseId() });
    const schema = { ...this.getSchema() };
    Object.keys(db.properties).forEach(propertyKey => delete schema[propertyKey]);
    if (Object.keys(schema).length === 0) return;
    await this.notion.databases.update({
      database_id: this.getDatabaseId(),
      properties: schema,
    });
    this.isInitialized = true;
  }

  async cleanSelect(propertyName: string): Promise<void> {
    const db = await this.notion.databases.retrieve({ database_id: this.getDatabaseId() });
    const property = db.properties[propertyName];
    if (property.type !== 'select') return;
    const keptOptions: typeof property.select.options = [];
    for (const option of property.select.options) {
      const response = await this.notion.databases.query({
        database_id: this.getDatabaseId(),
        page_size: 1,
        filter: { property: propertyName, select: { equals: option.name } },
      });
      if (response.results.length > 0) {
        keptOptions.push(option);
      } else {
        this.logger.info(`Option not used, removing`, option.name);
      }
    }
    keptOptions.sort((a, b) => a.name.localeCompare(b.name));

    const newSchema = {
      [propertyName]: {
        ...property,
        select: {
          ...property.select,
          options: keptOptions,
        },
      },
    };
    await this.notion.databases.update({
      database_id: this.getDatabaseId(),
      properties: newSchema,
    });
  }

  async cleanMultiSelect(propertyName: string): Promise<void> {
    this.logger.info('Cleaning property', propertyName);
    const db = await this.notion.databases.retrieve({ database_id: this.getDatabaseId() });
    const property = db.properties[propertyName];
    if (property.type !== 'multi_select') return;
    const keptOptions: typeof property.multi_select.options = [];
    for (const option of property.multi_select.options) {
      const response = await this.notion.databases.query({
        database_id: this.getDatabaseId(),
        page_size: 1,
        filter: { property: propertyName, multi_select: { contains: option.name } },
      });
      if (response.results.length > 0) {
        keptOptions.push(option);
      } else {
        this.logger.info(`Option not used, removing`, option.name);
      }
    }
    keptOptions.sort((a, b) => a.name.localeCompare(b.name));

    const newSchema = {
      [propertyName]: {
        ...property,
        multi_select: {
          ...property.multi_select,
          options: keptOptions,
        },
      },
    };
    await this.notion.databases.update({
      database_id: this.getDatabaseId(),
      properties: newSchema,
    });
  }

  async removeAllPages(): Promise<void> {
    let response: QueryDatabaseResponse;
    do {
      response = await this.notion.databases.query({ database_id: this.getDatabaseId() });
      for (const result of response.results) {
        await this.deletePage(result.id);
      }
    } while (response.has_more);
  }

  async getPageIdByTitle(title: string): Promise<string | undefined> {
    const response = await this.notion.databases.query({
      database_id: this.getDatabaseId(),
      page_size: 1,
      filter: {
        property: 'title',
        rich_text: { equals: title },
      },
    });

    return response.results[0]?.id;
  }

  async getCurrentId(page: T): Promise<string | undefined> {
    const response = await this.notion.databases.query({
      database_id: this.getDatabaseId(),
      page_size: 1,
      filter: { property: 'URI', url: { equals: page.uri } },
    });

    return response.results[0]?.id;
  }

  async getPageAndData(pageId: string): Promise<{ page: GetPageResponse; data: T }> {
    const page = await this.notion.pages.retrieve({ page_id: pageId });
    return { page, data: {} as T };
  }

  async addPage(entity: T): Promise<string> {
    this.logger.info(`Saving ${entity.name}`, entity.name);
    let pageId = await this.getCurrentId(entity);
    entity = await this.savePreprocess(entity);
    const properties = this.getProperties(entity);

    if (pageId) {
      this.logger.info('Updating', entity.uri);
      // await this.deleteChildren(currentId);
      // const newChildren = this.getChildren(page);
      // await this.notion.blocks.children.append({ block_id: currentId, children: newChildren ?? [] });
      await this.notion.pages.update({
        page_id: pageId,
        properties,
        icon: this.getIcon(entity),
        cover: this.getCover(entity),
      });
    } else {
      const alreadyExists = await this.alreadyExistsFromOtherDataSource(entity);
      if (alreadyExists) {
        this.logger.info('Entity already exists, skipping', { pageId: alreadyExists });
        return alreadyExists;
      }
      this.logger.info('Creating', entity.uri);
      pageId = (
        await this.notion.pages.create({
          parent: { type: 'database_id', database_id: this.getDatabaseId() },
          properties,
          icon: this.getIcon(entity),
          cover: this.getCover(entity),
          children: this.getChildren(entity),
        })
      ).id;
    }

    await this.savePostProcess(pageId, entity);
    return pageId;
  }

  async patchPage(pageId: string, page: Partial<T>): Promise<string> {
    const properties = this.getProperties(page);

    return (
      await this.notion.pages.update({
        page_id: pageId,
        properties,
      })
    ).id;
  }

  protected async deletePage(pageId: string): Promise<void> {
    this.notion.pages.update({ page_id: pageId, archived: true });
  }

  protected async deleteChildren(pageId: string): Promise<void> {
    let hasMore = true;
    while (hasMore) {
      const children = await this.notion.blocks.children.list({ block_id: pageId });
      for (const child of children.results) {
        await this.notion.blocks.delete({ block_id: child.id });
      }
      hasMore = children.has_more;
    }
  }

  protected async alreadyExistsFromOtherDataSource(entity: T): Promise<string | undefined> {
    const response = await this.notion.databases.query({
      database_id: this.getDatabaseId(),
      page_size: 1,
      filter: {
        and: [
          { property: 'URI', url: { does_not_equal: entity.uri } },
          { property: 'Lang', select: { equals: entity.lang } },
          {
            or: [
              {
                property: 'Name',
                rich_text: { equals: entity.name! },
              },
              {
                property: 'Alt Names',
                rich_text: { contains: entity.name! },
              },
            ],
          },
        ],
      },
    });
    return response.results[0]?.id;
  }

  protected async savePreprocess(entity: T): Promise<T> {
    for (const altName of entity.altNames ?? []) {
      const response = await this.notion.databases.query({
        database_id: this.getDatabaseId(),
        page_size: 1,
        filter: {
          and: [
            // TODO get property keys from config
            { property: 'URI', url: { does_not_equal: entity.uri } },
            { property: 'Lang', select: { does_not_equal: entity.lang } },
            {
              property: 'Name',
              rich_text: { equals: altName },
            },
          ],
        },
      });
      const otherPageId = response.results[0]?.id;
      if (otherPageId) {
        this.logger.info(`${entity.name} is same as ${otherPageId}`);
        entity = produce(entity, draft => {
          draft.altNames = draft.altNames?.filter(n => n !== altName);
          draft.sameAs = Array.from(new Set([otherPageId, ...(draft.sameAs ?? [])]));
        });
        break;
      }
    }

    return produce(entity, draft => {
      draft.altNames = draft.altNames?.filter(n => n !== draft.name);
    });
  }

  protected async savePostProcess(pageId: string, entity: T): Promise<void> {
    if (!entity.sameAs || entity.sameAs.length === 0) return;
    this.logger.info(`Setting sameAs in sibling pages`);
    for (const sameAs of entity.sameAs ?? []) {
      await this.patchPage(sameAs, { sameAs: [pageId] } as Partial<T>);
    }
  }

  protected abstract getProperties(page: Partial<T>): any;
  protected abstract getChildren(page: T): CreatePageParameters['children'];
  protected abstract getIcon(page: T): CreatePageParameters['icon'] | undefined;
  protected abstract getCover(page: T): CreatePageParameters['cover'] | undefined;
  protected abstract getDatabaseId(): string;
  protected abstract getSchema(): UpdateDatabaseParameters['properties'];
  protected abstract getTitle(page: T): string;
}

export type PropertiesSchema = UpdateDatabaseParameters['properties'];
