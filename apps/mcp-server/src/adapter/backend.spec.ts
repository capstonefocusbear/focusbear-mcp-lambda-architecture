import { AdapterConfig } from './config';
import { BackendClient, BackendCredentialProvider } from './backend';

const config: AdapterConfig = {
  resourceUrl: 'https://mcp.example/mcp',
  issuer: 'https://issuer.example',
  jwksUrl: 'https://issuer.example/jwks',
  backendUrl: 'https://api.example',
  allowedOrigins: [],
  allowLocalHttp: false,
};

describe('backend client', () => {
  const credentials: BackendCredentialProvider = { getToken: async () => ({ token: 'separate-backend-token' }) };
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses the fixed origin, delegated token, and request ID', async () => {
    const fetchMock = jest.fn(
      async (_url: unknown, _options: unknown) => new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    const result = await new BackendClient(config, credentials).request(
      'GET',
      '/mcp/tasks',
      'client-token',
      'user-1',
      'request-1',
      undefined,
      { page: 1 },
    );
    expect(result).toEqual({ data: [] });
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.example/mcp/tasks?page=1');
    const options = fetchMock.mock.calls[0][1] as any;
    expect(options.headers.authorization).toBe('Bearer separate-backend-token');
    expect(options.headers['x-request-id']).toBe('request-1');
    expect(JSON.stringify(options)).not.toContain('client-token');
  });

  it('retries a failed read once and never retries a write', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('network'));
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(
      new BackendClient(config, credentials).request('GET', '/mcp/tasks', 'client-token', 'user-1', 'request-1'),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockClear();
    await expect(
      new BackendClient(config, credentials).request(
        'POST',
        '/mcp/tasks/project-statuses',
        'client-token',
        'user-1',
        'request-2',
        {},
      ),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects caller-selected backend paths', async () => {
    await expect(
      new BackendClient(config, credentials).request('GET', '/admin/users', 'client-token', 'user-1', 'request-1'),
    ).rejects.toThrow('invalid_route');
  });

  it('refuses to pass through the client token', async () => {
    const unsafe: BackendCredentialProvider = { getToken: async () => ({ token: 'client-token' }) };
    await expect(
      new BackendClient(config, unsafe).request('GET', '/mcp/tasks', 'client-token', 'user-1', 'request-1'),
    ).rejects.toThrow('backend_delegation_unavailable');
  });
});
