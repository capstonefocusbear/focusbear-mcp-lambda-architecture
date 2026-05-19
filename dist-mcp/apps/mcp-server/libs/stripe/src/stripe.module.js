"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeModule = void 0;
const common_1 = require("@nestjs/common");
const observability_1 = require("../../observability/src");
const config_1 = require("@nestjs/config");
const bull_1 = require("@nestjs/bull");
const revenue_cat_1 = require("../../revenue-cat/src");
const send_grid_1 = require("../../send-grid/src");
const auth0_1 = require("../../auth0/src");
const user_repository_1 = require("../../../apps/api-server/src/modules/user/repositories/user.repository");
const src_1 = require("../../dynamic-module/src");
const stripe_constants_1 = require("./stripe.constants");
const stripe_service_1 = require("./stripe.service");
let StripeModule = class StripeModule extends (0, src_1.DynamicModuleFactory)(stripe_constants_1.STRIPE_MODULE_OPTIONS) {
};
exports.StripeModule = StripeModule;
exports.StripeModule = StripeModule = __decorate([
    (0, common_1.Module)({
        providers: [stripe_service_1.StripeService, user_repository_1.UserRepository],
        exports: [stripe_service_1.StripeService],
        imports: [
            bull_1.BullModule.registerQueue({
                name: 'emailQueue',
            }),
            observability_1.SentryModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (config) => config.get('sentry'),
            }),
            revenue_cat_1.RevenueCatModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => configService.get('revenueCat'),
            }),
            send_grid_1.SendGridModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => configService.get('sendGrid'),
            }),
            auth0_1.Auth0Module.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => configService.get('auth0'),
            }),
        ],
    })
], StripeModule);
//# sourceMappingURL=stripe.module.js.map