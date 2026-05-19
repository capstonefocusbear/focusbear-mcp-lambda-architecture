"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Auth0Module_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Auth0Module = void 0;
const common_1 = require("@nestjs/common");
const src_1 = require("../../dynamic-module/src");
const auth0_constants_1 = require("./auth0.constants");
const auth0_authentication_service_1 = require("./services/auth0-authentication.service");
const auth0_management_service_1 = require("./services/auth0-management.service");
let Auth0Module = Auth0Module_1 = class Auth0Module extends (0, src_1.DynamicModuleFactory)(auth0_constants_1.AUTH0_MODULE_OPTIONS) {
    static forRoot(options) {
        return {
            module: Auth0Module_1,
            providers: [
                {
                    provide: auth0_constants_1.AUTH0_MODULE_OPTIONS,
                    useValue: options,
                },
                auth0_authentication_service_1.Auth0AuthenticationService,
                auth0_management_service_1.Auth0ManagementService,
            ],
            exports: [auth0_authentication_service_1.Auth0AuthenticationService, auth0_management_service_1.Auth0ManagementService],
        };
    }
};
exports.Auth0Module = Auth0Module;
exports.Auth0Module = Auth0Module = Auth0Module_1 = __decorate([
    (0, common_1.Module)({
        providers: [auth0_authentication_service_1.Auth0AuthenticationService, auth0_management_service_1.Auth0ManagementService],
        exports: [auth0_authentication_service_1.Auth0AuthenticationService, auth0_management_service_1.Auth0ManagementService],
    })
], Auth0Module);
//# sourceMappingURL=auth0.module.js.map