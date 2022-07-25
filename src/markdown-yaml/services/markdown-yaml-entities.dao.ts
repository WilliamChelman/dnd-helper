import path from "path";
import fs from "fs";
import yaml from "yaml";
import prettier from "prettier";
import { Entity, EntityDao, LoggerFactory } from "../../core";
import { Injectable } from "injection-js";

@Injectable()
export class MarkdownYamlEntitiesDao implements EntityDao {
  id: string = "markdown-yaml-entities";
  logger = this.loggerFactory.create("MarkdownYamlEntitiesDao");

  constructor(private loggerFactory: LoggerFactory) {}

  getAll(): Promise<Entity[]> {
    throw new Error("Method not implemented.");
  }
  getByUri(uri: string): Promise<Entity> {
    throw new Error("Method not implemented.");
  }
  async save(entity: Entity): Promise<string> {
    this.logger.info(`Writing ${entity.name}`);
    const yamlPart = yaml.stringify({ ...entity, markdownContent: undefined });
    const lines = ["---", yamlPart, "---"];
    if (entity.markdownContent) {
      lines.push(entity.markdownContent);
    }
    const content = prettier.format(lines.join("\n"), { parser: "markdown" });
    const filePath = path.join(__dirname, "../../../dist", encodeURIComponent(entity.uri)) + ".md";
    const folderPath = path.dirname(filePath);
    fs.mkdirSync(folderPath, { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");

    return filePath;
  }
  patch(entity: Entity): Promise<string> {
    throw new Error("Method not implemented.");
  }
  canHandle(entityType: string): number {
    return 10;
  }
}
