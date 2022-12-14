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
  DdbBackgroundsInput,
  DdbBackgroundsMdOutput,
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
  DdbPlayerClassesInput,
  DdbPlayerClassesMdOutput,
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
    AideDdHelper,
    AssetsService,
    CacheService,
    ConfigService,
    DdbHelper,
    DdbLinkHelper,
    DdbMdHelper,
    DdbSourcesHelper,
    FiveEDrsHelper,
    HtmlElementHelper,
    LabelsHelper,
    NewPageService,
    UrlHelper,
    provideAsInputService(AideDdSpellsInput),
    provideAsInputService(DdbBackgroundsInput),
    provideAsInputService(DdbFeatsInput),
    provideAsInputService(DdbItemsInput),
    provideAsInputService(DdbMagicItemsInput),
    provideAsInputService(DdbMonstersInput),
    provideAsInputService(DdbPlayerClassesInput),
    provideAsInputService(DdbSourcesInput),
    provideAsInputService(DdbSpellsInput),
    provideAsInputService(FiveEDrsSpellsInput),
    provideAsOutputService(AideDdSpellsMdOutput),
    provideAsOutputService(DdbBackgroundsMdOutput),
    provideAsOutputService(DdbFeatsMdOutput),
    provideAsOutputService(DdbItemsMdOutput),
    provideAsOutputService(DdbMagicItemsMdOutput),
    provideAsOutputService(DdbMonstersMdOutput),
    provideAsOutputService(DdbPlayerClassesMdOutput),
    provideAsOutputService(DdbSourcesMdOutput),
    provideAsOutputService(DdbSpellsMdOutput),
    provideAsOutputService(FiveEDrsSpellsMdOutput),
    provideExitCleaner(CacheService),
    provideExitCleaner(NewPageService),
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
