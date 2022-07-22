import { Client } from "@notionhq/client";
import {
  CreatePageParameters,
  GetPageResponse,
  QueryDatabaseResponse,
  UpdateDatabaseParameters,
} from "@notionhq/client/build/src/api-endpoints";
import { Injectable } from "injection-js";

import { ConfigService } from "../../core";
import { NotionHelper } from "./notion.helper";

@Injectable()
export abstract class NotionDbService<T, U> {
  notion = new Client({
    auth: this.configService.config.notion.auth,
  });

  constructor(protected configService: ConfigService, protected notionHelper: NotionHelper) {}

  async initSchema(): Promise<void> {
    const db = await this.notion.databases.retrieve({ database_id: this.getDatabaseId() });
    const schema = { ...this.getSchema() };
    Object.keys(db.properties).forEach((propertyKey) => delete schema[propertyKey]);
    if (Object.keys(schema).length === 0) return;
    await this.notion.databases.update({
      database_id: this.getDatabaseId(),
      properties: schema,
    });
  }

  async cleanSelect(propertyName: string): Promise<void> {
    const db = await this.notion.databases.retrieve({ database_id: this.getDatabaseId() });
    const property = db.properties[propertyName];
    if (property.type !== "select") return;
    console.log("schema", property);
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
        console.log(`Option not used, removing`, option.name);
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
    console.log("Cleaning property", propertyName);
    const db = await this.notion.databases.retrieve({ database_id: this.getDatabaseId() });
    const property = db.properties[propertyName];
    if (property.type !== "multi_select") return;
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
        console.log(`Option not used, removing`, option.name);
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
        property: "title",
        rich_text: { equals: title },
      },
    });

    return response.results[0]?.id;
  }

  async addPages(pages: T[]): Promise<void> {
    for (const page of pages) {
      try {
        await this.addPage(page);
      } catch (err) {
        console.error(`Failed to add page`, page);
        console.error(err);
      }
    }
  }

  async getCurrentId(page: T): Promise<string | undefined> {
    const title = this.getTitle(page);
    return await this.getPageIdByTitle(title);
  }

  async getPageAndData(pageId: string): Promise<{ page: GetPageResponse; data: T }> {
    const page = await this.notion.pages.retrieve({ page_id: pageId });
    return { page, data: {} as T };
  }

  async addPage(page: T): Promise<string> {
    const properties = this.getProperties(page);
    const title = this.getTitle(page);
    const currentId = await this.getCurrentId(page);

    if (currentId) {
      console.log("Updating", title);
      await this.deleteChildren(currentId);
      const newChildren = this.getChildren(page);
      await this.notion.blocks.children.append({ block_id: currentId, children: newChildren ?? [] });
      return (
        await this.notion.pages.update({
          page_id: currentId,
          properties,
          icon: this.getIcon(page),
          cover: this.getCover(page),
        })
      ).id;
    } else {
      console.log("Creating", title);
      return (
        await this.notion.pages.create({
          parent: { type: "database_id", database_id: this.getDatabaseId() },
          properties,
          icon: this.getIcon(page),
          cover: this.getCover(page),
          children: this.getChildren(page),
        })
      ).id;
    }
  }

  async patchPage(pageId: string, page: T): Promise<string> {
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

  protected abstract getProperties(page: T): any;
  protected abstract getChildren(page: T): CreatePageParameters["children"];
  protected abstract getIcon(page: T): CreatePageParameters["icon"] | undefined;
  protected abstract getCover(page: T): CreatePageParameters["cover"] | undefined;
  protected abstract getDatabaseId(): string;
  protected abstract getSchema(): UpdateDatabaseParameters["properties"];
  protected abstract getTitle(page: T): string;
}

export type PropertiesSchema = UpdateDatabaseParameters["properties"];

export interface NotionDbServiceOptions {
  schema: PropertiesSchema;
  databaseId: string;
}
