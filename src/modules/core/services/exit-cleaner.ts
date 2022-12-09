import { Provider, Type } from 'injection-js';

export abstract class ExitCleaner {
  abstract clean(): Promise<void>;
}

export function provideExitCleaner(type: Type<ExitCleaner>): Provider {
  return {
    provide: ExitCleaner,
    useExisting: type,
    multi: true,
  };
}
