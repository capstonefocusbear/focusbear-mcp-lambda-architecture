import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { createToolServer, ToolContext } from './tools';

export const PROTOCOL_VERSION = '2026-07-28';
const serverInfo = { name: 'focusware-mcp', version: '2.0.0' };

// SDK 1.27.1 supplies tool registration, schema validation and dispatch. Its HTTP
// transport implements the old initialize/session protocol, so it is not used.
export async function dispatchRequest(body: JSONRPCMessage, context: ToolContext): Promise<unknown> {
  if ('method' in body && body.method === 'server/discover') {
    return {
      jsonrpc: '2.0',
      id: 'id' in body ? body.id : undefined,
      result: {
        resultType: 'complete',
        supportedVersions: [PROTOCOL_VERSION],
        capabilities: { tools: {} },
        _meta: { 'io.modelcontextprotocol/serverInfo': serverInfo },
      },
    };
  }
  const server = createToolServer(context);
  let timer: ReturnType<typeof setTimeout>;
  let complete: (message: JSONRPCMessage) => void;
  const result = new Promise<JSONRPCMessage>((resolve, reject) => {
    complete = resolve;
    timer = setTimeout(() => reject(new Error('request_timeout')), 9000);
  });
  const transport: Transport = {
    async start() {
      // The request is already buffered; this transport owns no socket or session.
    },
    async close() {
      transport.onclose?.();
    },
    async send(message) {
      if ('result' in message) {
        complete({
          ...message,
          result: {
            ...message.result,
            resultType: 'complete',
            _meta: { 'io.modelcontextprotocol/serverInfo': serverInfo },
          },
        });
      } else if ('error' in message) {
        // Do not expose SDK validation details, input data or upstream messages.
        complete({ jsonrpc: '2.0', id: message.id, error: { code: message.error.code, message: 'Invalid request' } });
      }
    },
  };
  try {
    await server.connect(transport);
    transport.onmessage(body);
    return await result;
  } finally {
    clearTimeout(timer);
    await server.close();
  }
}
