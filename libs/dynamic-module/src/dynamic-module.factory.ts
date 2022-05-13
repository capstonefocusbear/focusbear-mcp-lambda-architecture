/* eslint-disable @typescript-eslint/no-this-alias */
import { DynamicModule, Provider } from '@nestjs/common';
import { IModuleAsyncOptions, IModuleOptionsFactory } from './dynamic-module.interface';

export function DynamicModuleFactory<IModuleOptions>(provide: string | symbol) {
  return class BaseDynamicModule {
    static register(options: IModuleOptions): DynamicModule {
      const module = this;
      const providers = this.createModuleProvider(options);
      return { module, providers };
    }

    static createModuleProvider(options: IModuleOptions): any[] {
      return [{ provide, useValue: options || {} }];
    }

    static registerAsync(options: IModuleAsyncOptions<IModuleOptions>): DynamicModule {
      const module = this;
      const imports = options.imports || [];
      const providers = this.createAsyncProviders(options);
      return { module, imports, providers };
    }

    static createAsyncProviders(options: IModuleAsyncOptions<IModuleOptions>): Provider[] {
      const asyncProvider = this.createAsyncOptionsProvider(options);
      const isExistingOrFactory = Boolean(options.useExisting || options.useFactory);
      if (isExistingOrFactory) return [asyncProvider];
      const useClassProvider = { provide: options.useClass, useClass: options.useClass };
      return [asyncProvider, useClassProvider];
    }

    static createAsyncOptionsProvider(options: IModuleAsyncOptions<IModuleOptions>): Provider {
      const { useFactory, useClass, useExisting, inject } = options;
      const useFactoryProvider = { provide, useFactory, inject: inject || [] };
      const hasFactory = Boolean(useFactory);
      if (hasFactory) return useFactoryProvider;
      const factory = async (optionsFactory: IModuleOptionsFactory<IModuleOptions>) =>
        optionsFactory.createModuleOptions();
      return { provide, useFactory: factory, inject: [useExisting || useClass] };
    }
  };
}
