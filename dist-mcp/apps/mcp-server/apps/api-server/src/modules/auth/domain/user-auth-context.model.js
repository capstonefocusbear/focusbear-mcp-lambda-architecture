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
exports.UserAuthContext = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const crypto_1 = require("crypto");
const subscription_status_model_1 = require("../../subscription/domain/subscription-status.model");
class UserAuthContext {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String, format: "uuid" }, subscriptionStatus: { required: false, type: () => require("../../subscription/domain/subscription-status.model").SubscriptionStatus }, stripeCustomerId: { required: false, type: () => String }, email: { required: false, type: () => String } };
    }
}
exports.UserAuthContext = UserAuthContext;
__decorate([
    (0, swagger_1.ApiProperty)({ example: (0, crypto_1.randomUUID)() }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UserAuthContext.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", subscription_status_model_1.SubscriptionStatus)
], UserAuthContext.prototype, "subscriptionStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UserAuthContext.prototype, "stripeCustomerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], UserAuthContext.prototype, "email", void 0);
//# sourceMappingURL=user-auth-context.model.js.map