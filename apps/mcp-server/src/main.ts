import { createServer } from 'node:http';
import { createAdapterHandler } from './adapter/http';
import { loadAdapterConfig } from './adapter/config';
import { createTokenVerifier } from './adapter/auth';
import { BackendClient } from './adapter/backend';

// AWS packaging can mount this same request handler behind its web adapter.
export function createLocalHandler() {
  const config = loadAdapterConfig();
  return createAdapterHandler({
    config,
    verifier: createTokenVerifier(config),
    backend: new BackendClient(config, (event) => process.stdout.write(JSON.stringify(event) + '\n')),
    telemetry: (event) => process.stdout.write(JSON.stringify(event) + '\n'),
  });
}

if (require.main === module) {
  const port = Number(process.env.MCP_PORT || 5039);
  const host = process.env.MCP_BIND_HOST || '127.0.0.1';
  createServer(createLocalHandler()).listen(port, host, () => {
    process.stdout.write(`MCP adapter listening on ${host}:${port}\n`);
  });
}
