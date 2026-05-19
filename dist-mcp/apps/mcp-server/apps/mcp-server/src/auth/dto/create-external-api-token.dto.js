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
exports.CreateExternalApiTokenDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const mcp_scopes_enum_1 = require("../domain/mcp-scopes.enum");
class CreateExternalApiTokenDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { scopes: { required: true, enum: require("../domain/mcp-scopes.enum").McpScope, isArray: true }, label: { required: false, type: () => String }, agent_name: { required: false, type: () => String, maxLength: 100 } };
    }
}
exports.CreateExternalApiTokenDto = CreateExternalApiTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Scopes granted to this token',
        enum: mcp_scopes_enum_1.McpScope,
        isArray: true,
        example: ['tasks:read', 'tasks:write'],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(mcp_scopes_enum_1.McpScope, { each: true }),
    __metadata("design:type", Array)
], CreateExternalApiTokenDto.prototype, "scopes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Human-readable label for this token (e.g. "My MCP Client")',
        required: false,
        example: 'My MCP Client',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExternalApiTokenDto.prototype, "label", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Name of the AI agent this token belongs to (e.g. "Captain Codebeard")',
        required: false,
        example: 'Captain Codebeard',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateExternalApiTokenDto.prototype, "agent_name", void 0);
//# sourceMappingURL=create-external-api-token.dto.js.map