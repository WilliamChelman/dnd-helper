import 'reflect-metadata';

import { Injector, ReflectiveInjector } from 'injection-js';

import { FiveEDrsMonstersDao } from './5e-drs';
import { FiveEDrsSpellsDao } from './5e-drs/services/5e-drs-spells.dao';
import { AideDdMonstersDao, AideDdSpellsDao } from './aidedd';
import {
  AssetsService,
  ConfigService,
  DaoConfig,
  EntityDao,
  HtmlElementHelper,
  LabelsHelper,
  LoggerFactory,
  PageServiceFactory,
  PrefixService,
} from './core';
import { DdbHelper, DdbMagicItemsDao, DdbMonstersDao, DdbSourcesDao, DdbSpellsDao } from './ddb';
import { DdbItemsService } from './ddb/services/ddb-items.service';
import { NotionHelper, NotionItemsService, NotionSpellsDao } from './notion';
import { NotionMonstersDao } from './notion/services/notion-monsters.dao';
import { MarkdownYamlEntitiesDao } from './markdown-yaml';

export async function main() {
  const injector = ReflectiveInjector.resolveAndCreate([
    ConfigService,
    DdbHelper,
    AssetsService,
    HtmlElementHelper,
    NotionHelper,
    PageServiceFactory,
    NotionItemsService,
    LoggerFactory,
    DdbItemsService,
    LabelsHelper,
    PrefixService,
    {
      provide: EntityDao,
      useClass: DdbMonstersDao,
      multi: true,
    },
    {
      provide: EntityDao,
      useClass: DdbSpellsDao,
      multi: true,
    },
    {
      provide: EntityDao,
      useClass: DdbSourcesDao,
      multi: true,
    },
    {
      provide: EntityDao,
      useClass: DdbMagicItemsDao,
      multi: true,
    },
    {
      provide: EntityDao,
      useClass: NotionMonstersDao,
      multi: true,
    },
    {
      provide: EntityDao,
      useClass: NotionSpellsDao,
      multi: true,
    },
    {
      provide: EntityDao,
      useClass: AideDdSpellsDao,
      multi: true,
    },
    {
      provide: EntityDao,
      useClass: AideDdMonstersDao,
      multi: true,
    },
    {
      provide: EntityDao,
      useClass: FiveEDrsMonstersDao,
      multi: true,
    },
    {
      provide: EntityDao,
      useClass: FiveEDrsSpellsDao,
      multi: true,
    },
    {
      provide: EntityDao,
      useClass: MarkdownYamlEntitiesDao,
      multi: true,
    },
  ]);

  const runner = new Main(injector);
  await runner.run();
}

class Main {
  private daoList = this.injector.get(EntityDao) as EntityDao[];

  constructor(private injector: Injector) {}

  async run(): Promise<void> {
    const configService = this.injector.get(ConfigService) as ConfigService;
    const pageServiceFactory = this.injector.get(PageServiceFactory) as PageServiceFactory;
    try {
      for (const flow of configService.config.flows.filter(f => !f.disabled)) {
        for (const [sourceId, sourceConfig] of Object.entries(flow.sources)) {
          const sourceDao = this.getDao(sourceId, sourceConfig);
          if (!sourceDao) continue;
          const entities = await sourceDao.getAll();
          for (const entity of entities) {
            for (const [destinationId, destinationConfig] of Object.entries(flow.destinations)) {
              const destinationDao = this.getDao(destinationId, destinationConfig);
              if (!destinationDao) continue;
              if (!destinationDao.canHandle(entity.entityType)) continue;
              await destinationDao.save(entity);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      pageServiceFactory.closeAll();
    }
  }

  private getDao(daoId: string, daoConfig: boolean | DaoConfig): EntityDao | undefined {
    if (!daoConfig) return;
    const dao = this.daoList.find(dao => dao.id === daoId);
    if (!dao) {
      throw new Error(`Cannot find Dao with id "${daoId}"`);
    }
    return dao;
  }
}

// main();
