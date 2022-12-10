// import 'reflect-metadata';
import { Injector, ReflectiveInjector } from 'injection-js';

import { FiveEDrsHelper, FiveEDrsMonstersDao, FiveEDrsSpellsInput, FiveEDrsSpellsMdOutput } from './5e-drs';
import { AideDdHelper, AideDdMonstersDao, AideDdSpellsInput } from './aidedd';
import { AideDdSpellsMdOutput } from './aidedd/services/aide-dd-spells.md-output';
import {
  AssetsService,
  CacheService,
  ConfigService,
  DaoConfig,
  EntityDao,
  HtmlElementHelper,
  LabelsHelper,
  LoggerFactory,
  NewPageService,
  PageServiceFactory,
  PrefixService,
  provideAsInputService,
  provideAsOutputService,
  provideExitCleaner,
  UrlHelper,
} from './core';
import {
  DdbFeatsInput,
  DdbFeatsMdOutput,
  DdbHelper,
  DdbItemsInput,
  DdbItemsMdOutput,
  DdbLinkHelper,
  DdbMagicItemsInput,
  DdbMagicItemsMdOutput,
  DdbMdHelper,
  DdbMonstersInput,
  DdbMonstersMdOutput,
  DdbSourcesHelper,
  DdbSourcesInput,
  DdbSourcesMdOutput,
  DdbSpellsInput,
  DdbSpellsMdOutput,
} from './ddb';
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
    UrlHelper,
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
    FiveEDrsHelper,
    AideDdHelper,
    // New architecture
    provideAsOutputService(DdbMagicItemsMdOutput),
    provideAsInputService(DdbMagicItemsInput),
    provideAsOutputService(DdbItemsMdOutput),
    provideAsInputService(DdbItemsInput),
    provideAsOutputService(DdbSpellsMdOutput),
    provideAsInputService(DdbSpellsInput),
    provideAsOutputService(DdbMonstersMdOutput),
    provideAsInputService(DdbMonstersInput),
    provideAsOutputService(DdbSourcesMdOutput),
    provideAsInputService(DdbSourcesInput),
    provideAsOutputService(DdbFeatsMdOutput),
    provideAsInputService(DdbFeatsInput),
    provideAsInputService(FiveEDrsSpellsInput),
    provideAsOutputService(FiveEDrsSpellsMdOutput),
    provideAsInputService(AideDdSpellsInput),
    provideAsOutputService(AideDdSpellsMdOutput),
    DdbMdHelper,
    DdbLinkHelper,
    DdbSourcesHelper,
    NewPageService,
    provideExitCleaner(NewPageService),
    CacheService,
    provideExitCleaner(CacheService),
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
