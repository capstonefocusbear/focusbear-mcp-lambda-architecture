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
var McpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpService = void 0;
const common_1 = require("@nestjs/common");
const tasks_service_1 = require("./services/tasks.service");
let McpService = McpService_1 = class McpService {
    constructor(tasksService) {
        this.tasksService = tasksService;
        this.logger = new common_1.Logger(McpService_1.name);
    }
    async handleStreamRequest1111111(body, userJwt, responseStream) {
        const { method, params, id } = body;
        const mcpAgentToken = '6537eff81cb66ec00f042aaa6a3ff4c6d4ea9e67b478132f39f66a51032aa2ad';
        let responsePayload;
        try {
            this.logger.log(`Processing MCP method: ${method}`);
            if (method === 'tools/list') {
                responsePayload = {
                    id,
                    result: {
                        tools: [
                            {
                                name: 'list_tasks',
                                description: 'Fetch the active tasks assigned to this AI agent',
                                inputSchema: { type: 'object', properties: {} },
                            },
                            {
                                name: 'update_task_status',
                                description: 'Update the status of a specific task',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        taskId: { type: 'string', description: 'The UUID of the task' },
                                        status: { type: 'string', description: 'The new status' },
                                    },
                                    required: ['taskId', 'status'],
                                },
                            },
                        ],
                    },
                };
            }
            else if (method === 'tools/call') {
                if (!mcpAgentToken)
                    throw new Error('MCP_AGENT_TOKEN is not set');
                if (params.name === 'list_tasks') {
                    const tasks = await this.tasksService.listTasks(mcpAgentToken, {});
                    responsePayload = { id, result: { content: [{ type: 'text', text: JSON.stringify(tasks) }] } };
                }
                else if (params.name === 'update_task_status') {
                    const updatedTask = await this.tasksService.updateTaskStatus(mcpAgentToken, params.arguments.taskId, {
                        status: params.arguments.status,
                    });
                    responsePayload = { id, result: { content: [{ type: 'text', text: JSON.stringify(updatedTask) }] } };
                }
                else {
                    responsePayload = { id, error: { code: -32601, message: `Tool ${params.name} not found` } };
                }
            }
            else {
                responsePayload = { id, error: { code: -32601, message: 'Method not found' } };
            }
        }
        catch (error) {
            this.logger.error(`Error processing MCP request: ${error.message}`);
            responsePayload = { id, error: { code: -32000, message: error.message } };
        }
        responseStream.write(`data: ${JSON.stringify(responsePayload)}\n\n`);
    }
    async handleStreamRequest(body, userJwt, responseStream) {
        const { method, params, id } = body;
        const actualToken = userJwt === null || userJwt === void 0 ? void 0 : userJwt.replace('Bearer ', '').trim();
        if (!actualToken) {
            this.logger.warn('Blocked MCP request: Missing Bearer token');
            responseStream.write(`data: ${JSON.stringify({
                id,
                error: { code: 401, message: 'Unauthorized: Missing or invalid token' },
            })}\n\n`);
            return;
        }
        let responsePayload;
        try {
            this.logger.log(`Processing MCP method: ${method}`);
            if (method === 'tools/list') {
                responsePayload = {
                    id,
                    result: {
                        tools: [
                            {
                                name: 'list_tasks',
                                description: 'Fetch the active tasks assigned to this AI agent',
                                inputSchema: { type: 'object', properties: {} },
                            },
                            {
                                name: 'update_task_status',
                                description: 'Update the status of a specific task',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        taskId: { type: 'string', description: 'The UUID of the task' },
                                        status: { type: 'string', description: 'The new status' },
                                    },
                                    required: ['taskId', 'status'],
                                },
                            },
                        ],
                    },
                };
            }
            else if (method === 'tools/call') {
                if (params.name === 'list_tasks') {
                    const tasks = await this.tasksService.listTasks(actualToken, {});
                    responsePayload = { id, result: { content: [{ type: 'text', text: JSON.stringify(tasks) }] } };
                }
                else if (params.name === 'update_task_status') {
                    const updatedTask = await this.tasksService.updateTaskStatus(actualToken, params.arguments.taskId, {
                        status: params.arguments.status,
                    });
                    responsePayload = { id, result: { content: [{ type: 'text', text: JSON.stringify(updatedTask) }] } };
                }
                else {
                    responsePayload = { id, error: { code: -32601, message: `Tool ${params.name} not found` } };
                }
            }
            else {
                responsePayload = { id, error: { code: -32601, message: 'Method not found' } };
            }
        }
        catch (error) {
            this.logger.error(`Error processing MCP request: ${error.message}`);
            responsePayload = { id, error: { code: -32000, message: error.message } };
        }
        responseStream.write(`data: ${JSON.stringify(responsePayload)}\n\n`);
    }
};
exports.McpService = McpService;
exports.McpService = McpService = McpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tasks_service_1.TasksService])
], McpService);
//# sourceMappingURL=mcp.service.js.map