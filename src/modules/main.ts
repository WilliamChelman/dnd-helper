// import 'reflect-metadata';
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
  InputService,
  LabelsHelper,
  LoggerFactory,
  OutputService,
  PageServiceFactory,
  PrefixService,
} from './core';
import {
  DdbHelper,
  DdbMagicItemsInput,
  DdbMagicItemsMdOutput,
  DdbMdHelper,
  DdbMonstersInput,
  DdbMonstersMdOutput,
  DdbSourcesInput,
  DdbSourcesMdOutput,
  DdbSpellsInput,
  DdbSpellsMdOutput,
} from './ddb';
import { DdbItemsService } from './ddb/services/ddb-items.service';
import { DefaultMdOutput } from './markdown-yaml';
import { NotionHelper, NotionItemsService, NotionSpellsDao } from './notion';
import { NotionMonstersDao } from './notion/services/notion-monsters.dao';

export function getInjector() {
  return ReflectiveInjector.resolveAndCreate([
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

    NotionMonstersDao,
    {
      provide: EntityDao,
      useExisting: NotionMonstersDao,
      multi: true,
    },
    NotionSpellsDao,
    {
      provide: EntityDao,
      useExisting: NotionSpellsDao,
      multi: true,
    },
    AideDdSpellsDao,
    {
      provide: EntityDao,
      useExisting: AideDdSpellsDao,
      multi: true,
    },
    AideDdMonstersDao,
    {
      provide: EntityDao,
      useExisting: AideDdMonstersDao,
      multi: true,
    },
    FiveEDrsMonstersDao,
    {
      provide: EntityDao,
      useExisting: FiveEDrsMonstersDao,
      multi: true,
    },
    FiveEDrsSpellsDao,
    {
      provide: EntityDao,
      useExisting: FiveEDrsSpellsDao,
      multi: true,
    },
    // New architecture
    DefaultMdOutput,
    {
      provide: OutputService,
      useExisting: DefaultMdOutput,
      multi: true,
    },
    DdbMagicItemsMdOutput,
    {
      provide: OutputService,
      useExisting: DdbMagicItemsMdOutput,
      multi: true,
    },
    DdbMagicItemsInput,
    {
      provide: InputService,
      useExisting: DdbMagicItemsInput,
      multi: true,
    },
    DdbSpellsMdOutput,
    {
      provide: OutputService,
      useExisting: DdbSpellsMdOutput,
      multi: true,
    },
    DdbSpellsInput,
    {
      provide: InputService,
      useExisting: DdbSpellsInput,
      multi: true,
    },
    DdbMonstersMdOutput,
    {
      provide: OutputService,
      useExisting: DdbMonstersMdOutput,
      multi: true,
    },
    DdbMonstersInput,
    {
      provide: InputService,
      useExisting: DdbMonstersInput,
      multi: true,
    },
    DdbSourcesMdOutput,
    {
      provide: OutputService,
      useExisting: DdbSourcesMdOutput,
      multi: true,
    },
    DdbSourcesInput,
    {
      provide: InputService,
      useExisting: DdbSourcesInput,
      multi: true,
    },
    DdbMdHelper,
  ]);
}

class Main {
  private daoList = this.injector.get(EntityDao) as EntityDao[];

  constructor(private injector: Injector) {}

  async run(): Promise<void> {
    const configService = this.injector.get(ConfigService) as ConfigService;
    const pageServiceFactory = this.injector.get(PageServiceFactory) as PageServiceFactory;
    try {
      for (const flow of configService.config.flows?.filter(f => !f.disabled) ?? []) {
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
