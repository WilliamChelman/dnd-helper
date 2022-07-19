import { Client } from "@notionhq/client";
import { CreatePageParameters, QueryDatabaseResponse, UpdateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import { Injectable } from "injection-js";

import { ConfigService } from "../../core";
import { NotionHelper } from "./notion.helper";

@Injectable()
export abstract class NotionDbService<T, U> {
  protected notion = new Client({
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

  async removeAllPages(): Promise<void> {
    let response: QueryDatabaseResponse;
    do {
      response = await this.notion.databases.query({ database_id: this.getDatabaseId() });
      for (const result of response.results) {
        await this.notion.pages.update({ page_id: result.id, archived: true });
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
      const properties = this.getProperties(page);
      const title = this.getTitle(page);
      const currentId = await this.getPageIdByTitle(title);
      try {
        if (!currentId) {
          console.log("Creating", title);
          await this.notion.pages.create({
            parent: { type: "database_id", database_id: this.getDatabaseId() },
            properties,
            icon: this.getIcon(page),
            children: this.getChildren(page),
          });
        } else {
          console.log("Updating", title);
          await this.notion.pages.update({
            page_id: currentId,
            properties,
            icon: this.getIcon(page),
          });
        }
      } catch (err) {
        console.error(`Failed to add page`, page);
        console.error(err);
      }
    }
  }

  protected abstract getProperties(page: T): any;
  protected abstract getChildren(page: T): CreatePageParameters["children"];
  protected abstract getIcon(page: T): CreatePageParameters["icon"];
  protected abstract getDatabaseId(): string;
  protected abstract getSchema(): UpdateDatabaseParameters["properties"];
  protected abstract getTitle(page: T): string;
}

export type PropertiesSchema = UpdateDatabaseParameters["properties"];

export interface NotionDbServiceOptions {
  schema: PropertiesSchema;
  databaseId: string;
}
