import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OAuthStore, digest } from './oauth.store';

describe('OAuth durable handle store', () => {
  let store: OAuthStore;
  const db = { query: jest.fn(), transaction: jest.fn() };
  const originalKey = process.env.OAUTH_STATE_ENCRYPTION_KEY;
  beforeEach(() => {
    process.env.OAUTH_STATE_ENCRYPTION_KEY = 'cd'.repeat(32);
    jest.resetAllMocks();
    store = new OAuthStore(db as unknown as DataSource);
  });
  afterAll(() => {
    if (originalKey === undefined) delete process.env.OAUTH_STATE_ENCRYPTION_KEY;
    else process.env.OAUTH_STATE_ENCRYPTION_KEY = originalKey;
  });
  it('stores only hashed handles and encrypted state; atomically consumes an active handle', async () => {
    db.query.mockResolvedValue([]);
    const payload = { verifier: 'secret-verifier', userId: 'mapped-user' };
    const handle = await store.put('login', payload, 600);
    const params = db.query.mock.calls[1][1];
    expect(params[0]).toBe(digest(handle));
    expect(params[2]).not.toContain('secret-verifier');
    expect(params[2]).not.toContain('mapped-user');
    db.query.mockResolvedValueOnce([{ payload: params[2], active: true }]);
    expect(await store.take('login', handle)).toEqual(payload);
    expect(db.query.mock.calls[2][0]).toContain('WITH consumed AS (DELETE');
    expect(db.query.mock.calls[2][1]).toEqual([digest(handle), 'login']);
    db.query.mockResolvedValueOnce([]);
    expect(await store.take('login', handle)).toBeUndefined();
  });
  it('does not decrypt expired or tampered state', async () => {
    db.query.mockResolvedValueOnce([{ payload: 'corrupt', active: false }]);
    expect(await store.take('code', 'expired')).toBeUndefined();
    db.query.mockResolvedValueOnce([{ payload: 'corrupt', active: true }]);
    await expect(store.take('code', 'tampered')).rejects.toThrow(ServiceUnavailableException);
  });
  it('fails closed with sanitized 503 when persistence is unavailable', async () => {
    db.query.mockRejectedValue(new Error('database details and credentials'));
    try {
      await store.put('login', { sensitive: 'value' }, 600);
      throw new Error('expected rejection');
    } catch (error) {
      expect(error.getStatus()).toBe(503);
      expect(error.getResponse()).toEqual({ error: 'temporarily_unavailable' });
    }
  });
  it('rejects missing and ambiguous Auth0 subject mappings', async () => {
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'one' }, { id: 'two' }]);
    expect(await store.userForSubject('auth0|unknown')).toBeUndefined();
    expect(await store.userForSubject('auth0|ambiguous')).toBeUndefined();
  });
  it('atomically reserves hashed service assertions and rejects reuse', async () => {
    db.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ hash: 'reserved' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    expect(await (store as any).reserveAssertion('adapter', 'unique-assertion', 1801526470)).toBe(true);
    expect(await (store as any).reserveAssertion('adapter', 'unique-assertion', 1801526470)).toBe(false);
    const [sql, params] = db.query.mock.calls[1];
    expect(sql).toContain('ON CONFLICT DO NOTHING');
    expect(params).toEqual([digest(JSON.stringify(['adapter', 'unique-assertion'])), 1801526470]);
    expect(JSON.stringify(db.query.mock.calls)).not.toContain('unique-assertion');
  });
});
