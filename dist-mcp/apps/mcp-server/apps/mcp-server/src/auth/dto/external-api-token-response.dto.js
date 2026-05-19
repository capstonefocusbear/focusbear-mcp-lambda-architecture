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
exports.ExternalApiTokenIssuedResponseDto = exports.ExternalApiTokenResponseDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
class ExternalApiTokenResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, label: { required: false, type: () => String }, agent_name: { required: false, type: () => String }, scopes: { required: true, type: () => [String] }, last_used_at: { required: false, type: () => Date }, expires_at: { required: false, type: () => Date }, created_at: { required: true, type: () => String } };
    }
}
exports.ExternalApiTokenResponseDto = ExternalApiTokenResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Token UUID' }),
    __metadata("design:type", String)
], ExternalApiTokenResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Human-readable label', required: false }),
    __metadata("design:type", String)
], ExternalApiTokenResponseDto.prototype, "label", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Name of the AI agent this token belongs to', required: false }),
    __metadata("design:type", String)
], ExternalApiTokenResponseDto.prototype, "agent_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Scopes granted to this token', type: [String] }),
    __metadata("design:type", Array)
], ExternalApiTokenResponseDto.prototype, "scopes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'When the token was last used', required: false }),
    __metadata("design:type", Date)
], ExternalApiTokenResponseDto.prototype, "last_used_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'When the token expires (null = never)', required: false }),
    __metadata("design:type", Date)
], ExternalApiTokenResponseDto.prototype, "expires_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'When the token was created' }),
    __metadata("design:type", String)
], ExternalApiTokenResponseDto.prototype, "created_at", void 0);
class ExternalApiTokenIssuedResponseDto extends ExternalApiTokenResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { token: { required: true, type: () => String } };
    }
}
exports.ExternalApiTokenIssuedResponseDto = ExternalApiTokenIssuedResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The raw token — shown ONCE at issuance, never retrievable again. Store it securely.',
    }),
    __metadata("design:type", String)
], ExternalApiTokenIssuedResponseDto.prototype, "token", void 0);
//# sourceMappingURL=external-api-token-response.dto.js.map