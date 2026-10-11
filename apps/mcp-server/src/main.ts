import { createServer } from 'node:http';
import { createAdapterHandler } from './adapter/http';
import { loadAdapterConfig } from './adapter/config';
import { createTokenVerifier } from './adapter/auth';
import { BackendClient, unavailableBackendCredentials } from './adapter/backend';
import { createLogger, Logger } from './adapter/logger';

// AWS packaging can mount this same request handler behind its web adapter.
export function createLocalHandler(logger: Logger = createLogger()) {
  const config = loadAdapterConfig();
  return createAdapterHandler({
    config,
    verifier: createTokenVerifier(config),
    backend: new BackendClient(config, unavailableBackendCredentials),
    logger,
  });
}

if (require.main === module) {
  const logger = createLogger();
  const port = Number(process.env.MCP_PORT || 5039);
  const host = process.env.MCP_BIND_HOST || '127.0.0.1';
  createServer(createLocalHandler(logger)).listen(port, host, () => {
    logger.info('adapter_started', { host, port });
  });
}
