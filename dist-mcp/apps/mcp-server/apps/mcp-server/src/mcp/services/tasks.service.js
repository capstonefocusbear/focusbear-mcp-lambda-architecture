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
exports.TasksService = void 0;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let TasksService = class TasksService {
    constructor(httpService) {
        this.httpService = httpService;
        this.apiUrl = process.env.MAIN_API_URL || 'http://localhost:4000';
        this.internalKey = 'dev-secret';
    }
    async listTasks(mcpToken, query) {
        return this.makeApiRequest('GET', `/mcp/tasks`, mcpToken, query);
    }
    async getTask(mcpToken, taskId) {
        return this.makeApiRequest('GET', `/mcp/tasks/${taskId}`, mcpToken);
    }
    async updateTaskStatus(mcpToken, taskId, dto) {
        if (!dto.status && !dto.custom_status_id) {
            throw new common_1.BadRequestException('Provide at least one of: status, custom_status_id');
        }
        return this.makeApiRequest('PATCH', `/mcp/tasks/${taskId}/status`, mcpToken, undefined, dto);
    }
    async addNote(mcpToken, taskId, dto) {
        return this.makeApiRequest('POST', `/mcp/tasks/${taskId}/notes`, mcpToken, undefined, dto);
    }
    async ensureProjectStatus(mcpToken, dto) {
        return this.makeApiRequest('POST', `/mcp/tasks/project-statuses`, mcpToken, undefined, dto);
    }
    async makeApiRequest(method, path, mcpToken, params, data) {
        var _a, _b, _c;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.request({
                method,
                url: `${this.apiUrl}${path}`,
                params,
                data,
                timeout: 5000,
                headers: {
                    authorization: `Bearer ${mcpToken}`,
                    'x-internal-service-key': this.internalKey,
                },
            }));
            return response.data;
        }
        catch (error) {
            const status = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status;
            const message = ((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || error.message;
            if (status === 404)
                throw new common_1.NotFoundException(message);
            if (status === 400)
                throw new common_1.BadRequestException(message);
            if (status === 401)
                throw new common_1.UnauthorizedException(message);
            throw new common_1.InternalServerErrorException(`API Server Error: ${message}`);
        }
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map