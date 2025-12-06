import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { SentryService } from './sentry.service';
import { SENTRY_TOKEN } from './sentry.constants';

export interface SentryAsyncModuleOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (...args: any[]) => Promise<any> | any;
}

@Global()
@Module({})
export class SentryModule {
  static forRoot(): DynamicModule {
    return {
      module: SentryModule,
      providers: [
        SentryService,
        {
          provide: SENTRY_TOKEN,
          useExisting: SentryService,
        },
      ],
      exports: [SentryService, SENTRY_TOKEN],
    };
  }

  static forRootAsync(options: SentryAsyncModuleOptions): DynamicModule {
    const asyncOptionsProvider: Provider = {
      provide: 'SENTRY_MODULE_OPTIONS',
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      module: SentryModule,
      imports: options.imports || [],
      providers: [
        asyncOptionsProvider,
        SentryService,
        {
          provide: SENTRY_TOKEN,
          useExisting: SentryService,
        },
      ],
      exports: [SentryService, SENTRY_TOKEN],
    };
  }
}

