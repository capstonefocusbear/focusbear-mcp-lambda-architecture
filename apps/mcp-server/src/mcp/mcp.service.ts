import { Injectable, Logger } from '@nestjs/common';
import { TasksService } from './services/tasks.service';

// Newest first. If a client asks for a version we don't know, we reply with the first one.
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

export const SERVER_INFO = { name: 'focusbear-mcp-server', version: '0.1.0' };

// We only expose tools, and the tool list is static.
export const SERVER_CAPABILITIES = { tools: { listChanged: false } };

const TOOLS = [
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
];

// A JSON-RPC notification has a method but no id. The server must not reply to it.
export function isJsonRpcNotification(body: any): boolean {
  return typeof body?.method === 'string' && body.id === undefined;
}

const rpcResult = (id: any, result: unknown) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id: any, code: number, message: string) => ({
  jsonrpc: '2.0',
  id: id ?? null,
  error: { code, message },
});

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(private readonly tasksService: TasksService) {}

  async handleStreamRequest(body: any, userJwt: string, responseStream: any): Promise<void> {
    const { method, params, id } = body ?? {};

    // Notifications (e.g. notifications/initialized) get no response body at all.
    if (isJsonRpcNotification(body)) {
      this.logger.log(`Received MCP notification: ${method}`);
      return;
    }

    const actualToken = userJwt?.replace('Bearer ', '').trim();
    if (!actualToken) {
      this.logger.warn('Blocked MCP request: Missing Bearer token');
      this.send(responseStream, { id, error: { code: 401, message: 'Unauthorized: Missing or invalid token' } });
      return;
    }

    let responsePayload: any;

    try {
      this.logger.log(`Processing MCP method: ${method}`);

      switch (method) {
        case 'initialize':
          responsePayload = rpcResult(id, this.handleInitialize(params));
          break;
        case 'ping':
          responsePayload = rpcResult(id, {});
          break;
        case 'tools/list':
          responsePayload = rpcResult(id, { tools: TOOLS });
          break;
        case 'tools/call':
          responsePayload = await this.handleToolCall(id, params, actualToken);
          break;
        default:
          responsePayload = rpcError(id, -32601, 'Method not found');
      }
    } catch (error: any) {
      this.logger.error(`Error processing MCP request: ${error.message}`);
      responsePayload = rpcError(id, -32000, error.message);
    }

    this.send(responseStream, responsePayload);
  }

  private handleInitialize(params: any) {
    const requested = params?.protocolVersion;
    const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
      ? requested
      : SUPPORTED_PROTOCOL_VERSIONS[0];

    this.logger.log(
      `initialize: client=${
        params?.clientInfo?.name ?? 'unknown'
      } requested=${requested} negotiated=${protocolVersion}`,
    );

    return { protocolVersion, capabilities: SERVER_CAPABILITIES, serverInfo: SERVER_INFO };
  }

  private async handleToolCall(id: any, params: any, token: string) {
    const name = params?.name;
    const args = params?.arguments ?? {};

    if (name === 'list_tasks') {
      const tasks = await this.tasksService.listTasks(token, {});
      return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(tasks) }] });
    }

    if (name === 'update_task_status') {
      if (typeof args.taskId !== 'string' || typeof args.status !== 'string') {
        return rpcError(id, -32602, 'Invalid params: taskId and status must be strings');
      }
      const updatedTask = await this.tasksService.updateTaskStatus(token, args.taskId, { status: args.status });
      return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(updatedTask) }] });
    }

    return rpcError(id, -32601, `Tool ${name} not found`);
  }

  private send(responseStream: any, payload: unknown) {
    responseStream.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}
