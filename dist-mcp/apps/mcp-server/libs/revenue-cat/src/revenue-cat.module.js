"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevenueCatModule = void 0;
const common_1 = require("@nestjs/common");
const src_1 = require("../../dynamic-module/src");
const revenue_cat_constants_1 = require("./revenue-cat.constants");
const revenue_cat_service_1 = require("./revenue-cat.service");
let RevenueCatModule = class RevenueCatModule extends (0, src_1.DynamicModuleFactory)(revenue_cat_constants_1.REVENUE_CAT_MODULE_OPTIONS) {
};
exports.RevenueCatModule = RevenueCatModule;
exports.RevenueCatModule = RevenueCatModule = __decorate([
    (0, common_1.Module)({
        providers: [revenue_cat_service_1.RevenueCatService],
        exports: [revenue_cat_service_1.RevenueCatService],
    })
], RevenueCatModule);
//# sourceMappingURL=revenue-cat.module.js.map