"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SentryModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentryModule = void 0;
const common_1 = require("@nestjs/common");
const setup_1 = require("@sentry/nestjs/setup");
const sentry_service_1 = require("./sentry.service");
const sentry_constants_1 = require("./sentry.constants");
let SentryModule = SentryModule_1 = class SentryModule {
    static forRoot() {
        return {
            module: SentryModule_1,
            imports: [setup_1.SentryModule.forRoot()],
            providers: [
                sentry_service_1.SentryService,
                {
                    provide: sentry_constants_1.SENTRY_TOKEN,
                    useExisting: sentry_service_1.SentryService,
                },
            ],
            exports: [sentry_service_1.SentryService, sentry_constants_1.SENTRY_TOKEN],
        };
    }
    static forRootAsync(options) {
        const asyncOptionsProvider = {
            provide: 'SENTRY_MODULE_OPTIONS',
            useFactory: options.useFactory,
            inject: options.inject || [],
        };
        return {
            module: SentryModule_1,
            imports: [setup_1.SentryModule.forRoot(), ...(options.imports || [])],
            providers: [
                asyncOptionsProvider,
                sentry_service_1.SentryService,
                {
                    provide: sentry_constants_1.SENTRY_TOKEN,
                    useExisting: sentry_service_1.SentryService,
                },
            ],
            exports: [sentry_service_1.SentryService, sentry_constants_1.SENTRY_TOKEN],
        };
    }
};
exports.SentryModule = SentryModule;
exports.SentryModule = SentryModule = SentryModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], SentryModule);
//# sourceMappingURL=sentry.module.js.map