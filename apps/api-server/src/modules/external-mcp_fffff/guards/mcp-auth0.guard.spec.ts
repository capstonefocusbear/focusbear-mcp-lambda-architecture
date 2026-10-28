import { ExternalApiTokenGuard } from './external-api-token.guard';

describe('MCP authentication boundary', () => {
  const context = (token: string) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: `Bearer ${token}` } }) }),
      getHandler: () => jest.fn(),
    } as any);
  it('never falls back from a failed JWT to opaque token verification', async () => {
    const repository = { findByRawToken: jest.fn() };
    const oauth = { authenticate: jest.fn().mockRejectedValue(new Error('bad JWT')) };
    const guard = new ExternalApiTokenGuard(repository as any, {} as any, oauth as any);
    await expect(guard.canActivate(context('bad.jwt.token'))).rejects.toThrow();
    expect(repository.findByRawToken).not.toHaveBeenCalled();
  });
  it('delegates JWT authentication independently without a service key', async () => {
    const oauth = { authenticate: jest.fn().mockResolvedValue(undefined) };
    const guard = new ExternalApiTokenGuard({} as any, { get: jest.fn() } as any, oauth as any);
    await expect(guard.canActivate(context('signed.jwt.token'))).resolves.toBe(true);
    expect(oauth.authenticate).toHaveBeenCalled();
  });
  it('enforces route scope metadata after independent JWT verification', async () => {
    const oauth = {
      authenticate: jest.fn(async (request) => {
        request.mcpScopes = ['mcp.tasks.read'];
      }),
    };
    const reflector = { get: jest.fn().mockReturnValue('mcp.tasks.write') };
    const guard = new ExternalApiTokenGuard({} as any, reflector as any, oauth as any);
    await expect(guard.canActivate(context('signed.jwt.token'))).rejects.toThrow('missing required scope');
  });
});
