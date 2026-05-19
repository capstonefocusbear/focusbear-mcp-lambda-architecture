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
exports.McpAgentResponseDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
class McpAgentResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, agent_name: { required: false, type: () => String }, label: { required: false, type: () => String }, scopes: { required: true, type: () => [String] }, created_at: { required: true, type: () => String } };
    }
}
exports.McpAgentResponseDto = McpAgentResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Token ID — use this as assigned_mcp_token_id when assigning tasks to this agent' }),
    __metadata("design:type", String)
], McpAgentResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Agent name', required: false }),
    __metadata("design:type", String)
], McpAgentResponseDto.prototype, "agent_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Human-readable label for this token', required: false }),
    __metadata("design:type", String)
], McpAgentResponseDto.prototype, "label", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Scopes granted to this token', type: [String] }),
    __metadata("design:type", Array)
], McpAgentResponseDto.prototype, "scopes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'When the token was created' }),
    __metadata("design:type", String)
], McpAgentResponseDto.prototype, "created_at", void 0);
//# sourceMappingURL=mcp-agent-response.dto.js.map