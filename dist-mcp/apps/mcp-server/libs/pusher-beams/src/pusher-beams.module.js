"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PusherBeamsModule = void 0;
const common_1 = require("@nestjs/common");
const src_1 = require("../../dynamic-module/src");
const pusher_beams_constants_1 = require("./pusher-beams.constants");
const pusher_beams_service_1 = require("./pusher-beams.service");
let PusherBeamsModule = class PusherBeamsModule extends (0, src_1.DynamicModuleFactory)(pusher_beams_constants_1.PUSHER_BEAMS_MODULE_OPTIONS) {
};
exports.PusherBeamsModule = PusherBeamsModule;
exports.PusherBeamsModule = PusherBeamsModule = __decorate([
    (0, common_1.Module)({
        providers: [pusher_beams_service_1.PusherBeamsService],
        exports: [pusher_beams_service_1.PusherBeamsService],
    })
], PusherBeamsModule);
//# sourceMappingURL=pusher-beams.module.js.map