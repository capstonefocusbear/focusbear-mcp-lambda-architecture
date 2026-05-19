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
exports.ExternalMcpAuthService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let ExternalMcpAuthService = class ExternalMcpAuthService {
    constructor(httpService) {
        this.httpService = httpService;
    }
    get baseUrl() {
        return process.env.MAIN_API_URL || 'http://api-server:4000';
    }
    async issueToken(authorization, dto) {
        const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}/mcp/auth/tokens`, dto, {
            headers: authorization ? { authorization } : undefined,
        }));
        return data;
    }
    async listTokens(authorization) {
        const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/mcp/auth/tokens`, {
            headers: authorization ? { authorization } : undefined,
        }));
        return data;
    }
    async revokeToken(authorization, tokenId) {
        await (0, rxjs_1.firstValueFrom)(this.httpService.delete(`${this.baseUrl}/mcp/auth/tokens/${tokenId}`, {
            headers: authorization ? { authorization } : undefined,
        }));
    }
    async listAgents(authorization) {
        const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/mcp/auth/agents`, {
            headers: authorization ? { authorization } : undefined,
        }));
        return data;
    }
};
exports.ExternalMcpAuthService = ExternalMcpAuthService;
exports.ExternalMcpAuthService = ExternalMcpAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], ExternalMcpAuthService);
//# sourceMappingURL=auth.service.js.map