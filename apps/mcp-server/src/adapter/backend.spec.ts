const configIssuer = 'https://issuer.example';
import { AdapterConfig } from './config';
import { BackendClient } from './backend';

const context = {
  subject: 'user-1',
  issuer: configIssuer,
  clientId: 'public-client',
  expiresAt: 9999999999,
  scopes: new Set(['mcp.tasks.read']),
};

const config: AdapterConfig = {
  resourceUrl: 'https://mcp.example/mcp',
  issuer: 'https://issuer.example',
  jwksUrl: 'https://issuer.example/jwks',
  backendUrl: 'https://api.example',
  allowedOrigins: [],
  allowedClients: ['public-client'],
  tokenProfile: 'auth0',
  allowLocalHttp: false,
};

describe('backend client', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses the fixed origin, same MCP token, and request ID', async () => {
    const fetchMock = jest.fn(
      async (_url: unknown, _options: unknown) => new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    const result = await new BackendClient(config).request(
      'GET',
      '/mcp/tasks',
      'client-token',
      context,
      'request-1',
      undefined,
      { page: 1 },
    );
    expect(result).toEqual({ data: [] });
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.example/mcp/tasks?page=1');
    const options = fetchMock.mock.calls[0][1] as any;
    expect(options.headers.authorization).toBe('Bearer client-token');
    expect(options.headers['x-request-id']).toBe('request-1');
    expect(options.redirect).toBe('error');
  });

  it('retries a failed read once and never retries a write', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('network'));
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(
      new BackendClient(config).request('GET', '/mcp/tasks', 'client-token', context, 'request-1'),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockClear();
    await expect(
      new BackendClient(config).request(
        'POST',
        '/mcp/tasks/project-statuses',
        'client-token',
        context,
        'request-2',
        {},
      ),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports a safe correlated backend outcome when a tool will return HTTP 200', async () => {
    global.fetch = jest.fn(
      async () => new Response('private upstream failure', { status: 503 }),
    ) as unknown as typeof fetch;
    const telemetry = jest.fn((_event: unknown) => {
      throw new Error('sink offline');
    });
    await expect(
      new BackendClient(config, telemetry).request('GET', '/mcp/tasks', 'private-token', context, 'request-safe'),
    ).rejects.toThrow('backend_unavailable');
    expect(telemetry.mock.calls[0][0]).toEqual({
      request_id: 'request-safe',
      backend_status: 503,
      duration_ms: expect.any(Number),
      method: 'GET',
    });
  });

  it('rejects caller-selected backend paths', async () => {
    await expect(
      new BackendClient(config).request('GET', '/admin/users', 'client-token', context, 'request-1'),
    ).rejects.toThrow('invalid_route');
  });

  it.each([
    ['GET', '/mcp/tasks/project-statuses'],
    ['POST', '/mcp/tasks'],
    ['PATCH', '/mcp/tasks/summary'],
    ['GET', '/mcp/tasks/not-a-uuid'],
  ])('rejects unapproved method/route %s %s', async (method, path) => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(
      new BackendClient(config).request(method as any, path, 'client-token', context, 'request-1'),
    ).rejects.toThrow('invalid_route');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
