import { VerifiedToken } from './auth';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { BackendClient, BackendError } from './backend';

const uuid = z.string().uuid();
const list = z
  .object({
    page: z.number().int().min(1).max(10000).optional(),
    take: z.number().int().min(1).max(50).optional(),
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).optional(),
  })
  .strict();
const get = z.object({ task_id: uuid }).strict();
const updateObject = z
  .object({
    task_id: uuid,
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).optional(),
    custom_status_id: z.string().min(1).max(100).optional(),
  })
  .strict();
const update = updateObject.refine((value) => !!(value.status || value.custom_status_id));
const note = z.object({ task_id: uuid, content: z.string().min(1).max(10000) }).strict();
const projectStatus = z
  .object({
    project_id: uuid,
    label: z.string().min(1).max(100),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    should_complete_task: z.boolean().optional(),
  })
  .strict();

export const toolScopes: Record<string, string> = {
  focusware_list_assigned_tasks: 'mcp.tasks.read',
  focusware_get_assigned_task: 'mcp.tasks.read',
  focusware_update_assigned_task_status: 'mcp.tasks.write',
  focusware_add_assigned_task_note: 'mcp.tasks.write',
  focusware_ensure_project_status: 'mcp.tasks.write',
};

const toolSchemas: Record<string, z.ZodTypeAny> = {
  focusware_list_assigned_tasks: list,
  focusware_get_assigned_task: get,
  focusware_update_assigned_task_status: update,
  focusware_add_assigned_task_note: note,
  focusware_ensure_project_status: projectStatus,
};

export function validateToolCall(name: string, args: unknown): boolean {
  return !!toolSchemas[name]?.safeParse(args ?? {}).success;
}

export interface ToolContext {
  clientToken: string;
  verifiedToken: VerifiedToken;
  requestId: string;
  backend: BackendClient;
}

function task(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new BackendError('bad_backend_response', 502);
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string') throw new BackendError('bad_backend_response', 502);
  const safe: Record<string, unknown> = {};
  for (const field of [
    'id',
    'title',
    'details',
    'objective',
    'status',
    'custom_status_id',
    'project_id',
    'due_date',
    'created_at',
    'updated_at',
  ]) {
    if (typeof raw[field] === 'string' || raw[field] === null) safe[field] = raw[field];
  }
  return safe;
}

function shape(name: string, value: unknown): unknown {
  if (name === 'focusware_list_assigned_tasks') {
    if (!value || typeof value !== 'object' || !Array.isArray((value as any).data))
      throw new BackendError('bad_backend_response', 502);
    const raw = value as { data: unknown[]; meta?: unknown };
    const meta = raw.meta && typeof raw.meta === 'object' ? (raw.meta as Record<string, unknown>) : {};
    const safeMeta: Record<string, unknown> = {};
    for (const field of ['page', 'take', 'itemCount', 'pageCount', 'hasPreviousPage', 'hasNextPage'])
      if (typeof meta[field] === 'number' || typeof meta[field] === 'boolean') safeMeta[field] = meta[field];
    return { data: raw.data.slice(0, 50).map(task), meta: safeMeta };
  }
  if (name === 'focusware_ensure_project_status') {
    if (!value || typeof value !== 'object') throw new BackendError('bad_backend_response', 502);
    const raw = value as Record<string, unknown>;
    const safe: Record<string, unknown> = {};
    for (const field of ['id', 'label', 'color', 'order', 'should_complete_task', 'already_existed'])
      if (['string', 'number', 'boolean'].includes(typeof raw[field])) safe[field] = raw[field];
    return safe;
  }
  if (name === 'focusware_add_assigned_task_note') {
    if (!value || typeof value !== 'object') throw new BackendError('bad_backend_response', 502);
    const raw = value as Record<string, unknown>;
    const safe: Record<string, string> = {};
    for (const field of ['id', 'task_id', 'content', 'created_at'])
      if (typeof raw[field] === 'string') safe[field] = raw[field] as string;
    return safe;
  }
  return task(value);
}

async function invoke(name: string, args: Record<string, any>, context: ToolContext) {
  const { backend, clientToken, verifiedToken, requestId } = context;
  let value: unknown;
  if (name === 'focusware_list_assigned_tasks')
    value = await backend.request('GET', '/mcp/tasks', clientToken, verifiedToken, requestId, undefined, args);
  else if (name === 'focusware_get_assigned_task')
    value = await backend.request('GET', `/mcp/tasks/${args.task_id}`, clientToken, verifiedToken, requestId);
  else if (name === 'focusware_update_assigned_task_status')
    value = await backend.request('PATCH', `/mcp/tasks/${args.task_id}/status`, clientToken, verifiedToken, requestId, {
      status: args.status,
      custom_status_id: args.custom_status_id,
    });
  else if (name === 'focusware_add_assigned_task_note')
    value = await backend.request('POST', `/mcp/tasks/${args.task_id}/notes`, clientToken, verifiedToken, requestId, {
      content: args.content,
    });
  else
    value = await backend.request('POST', '/mcp/tasks/project-statuses', clientToken, verifiedToken, requestId, args);
  return { content: [{ type: 'text' as const, text: JSON.stringify(shape(name, value)) }] };
}

function handler(name: string, context: ToolContext) {
  return async (args: Record<string, any>) => {
    try {
      return await invoke(name, args, context);
    } catch (error) {
      const code = error instanceof BackendError ? error.code : 'backend_unavailable';
      return {
        isError: true,
        content: [{ type: 'text' as const, text: JSON.stringify({ code, request_id: context.requestId }) }],
      };
    }
  };
}

export function createToolServer(context: ToolContext): McpServer {
  const server = new McpServer({ name: 'focusware-mcp', version: '1.0.0' });
  const description = 'Only accesses tasks assigned to the authorized MCP agent.';
  server.registerTool(
    'focusware_list_assigned_tasks',
    { description: `List assigned tasks. ${description}`, inputSchema: list.shape },
    handler('focusware_list_assigned_tasks', context),
  );
  server.registerTool(
    'focusware_get_assigned_task',
    { description: `Get one assigned task. ${description}`, inputSchema: get.shape },
    handler('focusware_get_assigned_task', context),
  );
  server.registerTool(
    'focusware_update_assigned_task_status',
    { description: `Update an assigned task status. ${description}`, inputSchema: updateObject.shape },
    handler('focusware_update_assigned_task_status', context),
  );
  server.registerTool(
    'focusware_add_assigned_task_note',
    { description: `Add a note to an assigned task. ${description}`, inputSchema: note.shape },
    handler('focusware_add_assigned_task_note', context),
  );
  server.registerTool(
    'focusware_ensure_project_status',
    { description: 'Ensure a project status exists for an authorized project.', inputSchema: projectStatus.shape },
    handler('focusware_ensure_project_status', context),
  );
  return server;
}
