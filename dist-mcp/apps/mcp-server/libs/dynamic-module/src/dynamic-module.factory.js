"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicModuleFactory = DynamicModuleFactory;
function DynamicModuleFactory(provide) {
    return class BaseDynamicModule {
        static register(options) {
            const module = this;
            const providers = this.createModuleProvider(options);
            return { module, providers };
        }
        static createModuleProvider(options) {
            return [{ provide, useValue: options || {} }];
        }
        static registerAsync(options) {
            const module = this;
            const imports = options.imports || [];
            const providers = this.createAsyncProviders(options);
            return { module, imports, providers };
        }
        static createAsyncProviders(options) {
            const asyncProvider = this.createAsyncOptionsProvider(options);
            const isExistingOrFactory = Boolean(options.useExisting || options.useFactory);
            if (isExistingOrFactory)
                return [asyncProvider];
            const useClassProvider = { provide: options.useClass, useClass: options.useClass };
            return [asyncProvider, useClassProvider];
        }
        static createAsyncOptionsProvider(options) {
            const { useFactory, useClass, useExisting, inject } = options;
            const useFactoryProvider = { provide, useFactory, inject: inject || [] };
            const hasFactory = Boolean(useFactory);
            if (hasFactory)
                return useFactoryProvider;
            const factory = async (optionsFactory) => optionsFactory.createModuleOptions();
            return { provide, useFactory: factory, inject: [useExisting || useClass] };
        }
    };
}
//# sourceMappingURL=dynamic-module.factory.js.map