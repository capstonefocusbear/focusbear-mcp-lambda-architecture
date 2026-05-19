"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BeamsPublishRequest = void 0;
const openapi = require("@nestjs/swagger");
const PusherBeams = require("@pusher/push-notifications-server");
const class_validator_1 = require("class-validator");
class BeamsPublishRequest {
    constructor(data) {
        this.apns = data.apns;
        this.fcm = data.fcm;
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { apns: { required: true, type: () => Object }, fcm: { required: true, type: () => Object } };
    }
}
exports.BeamsPublishRequest = BeamsPublishRequest;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Object)
], BeamsPublishRequest.prototype, "apns", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Object)
], BeamsPublishRequest.prototype, "fcm", void 0);
//# sourceMappingURL=pusher-beams-publish-request.model.js.map