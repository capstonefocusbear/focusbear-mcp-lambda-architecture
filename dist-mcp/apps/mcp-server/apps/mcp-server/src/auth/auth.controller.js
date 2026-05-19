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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalMcpAuthController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_decorator_1 = require("./decorators/auth.decorator");
const auth_service_1 = require("./auth.service");
const create_external_api_token_dto_1 = require("./dto/create-external-api-token.dto");
let ExternalMcpAuthController = class ExternalMcpAuthController {
    constructor(externalMcpAuthService) {
        this.externalMcpAuthService = externalMcpAuthService;
    }
    async issueToken({ user }, dto, authorization) {
        return this.externalMcpAuthService.issueToken(authorization, dto);
    }
    async listTokens({ user }, authorization) {
        return this.externalMcpAuthService.listTokens(authorization);
    }
    async revokeToken(id, { user }, authorization) {
        return this.externalMcpAuthService.revokeToken(authorization, id);
    }
    async listAgents({ user }, authorization) {
        return this.externalMcpAuthService.listAgents(authorization);
    }
};
exports.ExternalMcpAuthController = ExternalMcpAuthController;
__decorate([
    (0, common_1.Post)('tokens'),
    (0, swagger_1.ApiOperation)({
        summary: 'Issue a new MCP access token',
        description: 'Generates a scoped access token for an MCP client.',
    }),
    openapi.ApiResponse({ status: 201, type: require("./dto/external-api-token-response.dto").ExternalApiTokenIssuedResponseDto }),
    __param(0, (0, auth_decorator_1.AuthContext)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_external_api_token_dto_1.CreateExternalApiTokenDto, String]),
    __metadata("design:returntype", Promise)
], ExternalMcpAuthController.prototype, "issueToken", null);
__decorate([
    (0, common_1.Get)('tokens'),
    (0, swagger_1.ApiOperation)({
        summary: 'List active MCP connections',
    }),
    openapi.ApiResponse({ status: 200, type: [require("./dto/external-api-token-response.dto").ExternalApiTokenResponseDto] }),
    __param(0, (0, auth_decorator_1.AuthContext)()),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ExternalMcpAuthController.prototype, "listTokens", null);
__decorate([
    (0, common_1.Delete)('tokens/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Revoke an MCP access token',
    }),
    openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, auth_decorator_1.AuthContext)()),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], ExternalMcpAuthController.prototype, "revokeToken", null);
__decorate([
    (0, common_1.Get)('agents'),
    (0, swagger_1.ApiOperation)({
        summary: 'List MCP agents for the current user',
    }),
    openapi.ApiResponse({ status: 200, type: [require("./dto/mcp-agent-response.dto").McpAgentResponseDto] }),
    __param(0, (0, auth_decorator_1.AuthContext)()),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ExternalMcpAuthController.prototype, "listAgents", null);
exports.ExternalMcpAuthController = ExternalMcpAuthController = __decorate([
    (0, common_1.Controller)('mcp/auth'),
    (0, swagger_1.ApiTags)('mcp-auth'),
    __metadata("design:paramtypes", [auth_service_1.ExternalMcpAuthService])
], ExternalMcpAuthController);
//# sourceMappingURL=auth.controller.js.map