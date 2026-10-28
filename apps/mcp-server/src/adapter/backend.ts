import { VerifiedToken } from './auth';
import { AdapterConfig } from './config';

export class BackendError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

export interface BackendTelemetry {
  request_id: string;
  backend_status: number;
  duration_ms: number;
  method: string;
}

export class BackendClient {
  constructor(private readonly config: AdapterConfig, private readonly telemetry?: (event: BackendTelemetry) => void) {}

  async request(
    method: 'GET' | 'PATCH' | 'POST',
    path: string,
    clientToken: string,
    context: VerifiedToken,
    requestId: string,
    body?: unknown,
    query?: Record<string, string | number>,
  ): Promise<unknown> {
    const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
    const allowed =
      (method === 'GET' &&
        (path === '/mcp/tasks' || path === '/mcp/tasks/summary' || new RegExp(`^/mcp/tasks/${uuid}$`).test(path))) ||
      (method === 'PATCH' && new RegExp(`^/mcp/tasks/${uuid}/status$`).test(path)) ||
      (method === 'POST' &&
        (path === '/mcp/tasks/project-statuses' || new RegExp(`^/mcp/tasks/${uuid}/notes$`).test(path)));
    if (!allowed) throw new BackendError('invalid_route', 500);
    if (!clientToken || context.expiresAt * 1000 <= Date.now()) throw new BackendError('backend_unauthorized', 401);
    const start = Date.now();
    const deadline = start + 8000;
    const report = (status: number) => {
      try {
        this.telemetry?.({ request_id: requestId, backend_status: status, duration_ms: Date.now() - start, method });
      } catch {
        /* Telemetry failures cannot change the request result. */
      }
    };
    const url = new URL(path, this.config.backendUrl);
    for (const [key, value] of Object.entries(query || {})) url.searchParams.set(key, String(value));
    const attempt = async (): Promise<unknown> => {
      let response: Response;
      try {
        response = await fetch(url, {
          method,
          redirect: 'error',
          signal: AbortSignal.timeout(Math.max(1, Math.min(5000, deadline - Date.now()))),
          headers: {
            authorization: `Bearer ${clientToken}`,
            'content-type': 'application/json',
            'x-request-id': requestId,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch {
        throw new BackendError('backend_transport_error', 503);
      }
      if (!response.ok) {
        const status = response.status;
        await response.body?.cancel();
        const code =
          status === 401
            ? 'backend_unauthorized'
            : status === 403
            ? 'backend_forbidden'
            : status === 404
            ? 'not_found'
            : status === 400
            ? 'bad_request'
            : status === 409
            ? 'conflict'
            : status === 429
            ? 'rate_limited'
            : 'backend_unavailable';
        throw new BackendError(code, status >= 500 ? 503 : status);
      }
      try {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('missing_body');
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (true) {
          // biome-ignore lint/performance/noAwaitInLoops: a response stream must be read sequentially.
          const { done, value } = await reader.read();
          if (done) break;
          total += value.length;
          if (total > 1_048_576) {
            await reader.cancel();
            throw new Error('too_large');
          }
          chunks.push(value);
        }
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        throw new BackendError('bad_backend_response', 502);
      }
    };
    try {
      let result: unknown;
      try {
        result = await attempt();
      } catch (error) {
        if (
          method !== 'GET' ||
          !(error instanceof BackendError) ||
          error.code !== 'backend_transport_error' ||
          Date.now() >= deadline
        )
          throw error;
        result = await attempt();
      }
      report(200);
      return result;
    } catch (error) {
      report(error instanceof BackendError ? error.status : 503);
      throw error;
    }
  }
}
