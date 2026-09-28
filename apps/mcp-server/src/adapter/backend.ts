import { AdapterConfig } from './config';

export interface BackendCredentials {
  token: string;
}

export interface BackendCredentialProvider {
  getToken(clientToken: string, subject: string): Promise<BackendCredentials>;
}

// The API server must implement token exchange or equivalent delegation before production use.
export const unavailableBackendCredentials: BackendCredentialProvider = {
  async getToken(): Promise<BackendCredentials> {
    throw new BackendError('backend_delegation_unavailable', 503);
  },
};

export class BackendError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

export class BackendClient {
  constructor(private readonly config: AdapterConfig, private readonly credentials: BackendCredentialProvider) {}

  async request(
    method: 'GET' | 'PATCH' | 'POST',
    path: string,
    clientToken: string,
    subject: string,
    requestId: string,
    body?: unknown,
    query?: Record<string, string | number>,
  ): Promise<unknown> {
    if (!/^\/mcp\/tasks(?:\/[a-zA-Z0-9-]+(?:\/status|\/notes)?)?$/.test(path))
      throw new BackendError('invalid_route', 500);
    const backendToken = (await this.credentials.getToken(clientToken, subject)).token;
    if (!backendToken || backendToken === clientToken) throw new BackendError('backend_delegation_unavailable', 503);
    const url = new URL(path, this.config.backendUrl);
    for (const [key, value] of Object.entries(query || {})) url.searchParams.set(key, String(value));
    const attempt = async (): Promise<unknown> => {
      let response: Response;
      try {
        response = await fetch(url, {
          method,
          redirect: 'error',
          signal: AbortSignal.timeout(5000),
          headers: {
            authorization: `Bearer ${backendToken}`,
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
      return await attempt();
    } catch (error) {
      if (method === 'GET' && error instanceof BackendError && error.code === 'backend_transport_error')
        return attempt();
      throw error;
    }
  }
}
