import { createLogger, describeError, hashSubject, REDACTED, redact } from './logger';
import { BackendError } from './backend';

const jwt = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.c2lnbmF0dXJlLXZhbHVl';

function capture(level?: 'debug' | 'info' | 'warn' | 'error' | 'silent') {
  const lines: string[] = [];
  const logger = createLogger({
    level,
    sink: (line) => lines.push(line),
    now: () => new Date('2026-10-11T00:00:00.000Z'),
  });
  return { logger, lines, entries: () => lines.map((line) => JSON.parse(line)) };
}

describe('adapter logger', () => {
  it('writes one JSON document per event with the standard fields', () => {
    const { logger, lines, entries } = capture();
    logger.info('request_completed', { request_id: 'request-1', status: 200, duration_ms: 12 });
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain('\n');
    expect(entries()[0]).toEqual({
      timestamp: '2026-10-11T00:00:00.000Z',
      level: 'info',
      service: 'focusware-mcp',
      event: 'request_completed',
      request_id: 'request-1',
      status: 200,
      duration_ms: 12,
    });
  });

  it('filters by level and can be silenced', () => {
    const warn = capture('warn');
    warn.logger.debug('a');
    warn.logger.info('b');
    warn.logger.warn('c');
    warn.logger.error('d');
    expect(warn.entries().map((entry) => entry.event)).toEqual(['c', 'd']);
    const silent = capture('silent');
    silent.logger.error('e');
    expect(silent.lines).toHaveLength(0);
  });

  it('reads the level from MCP_LOG_LEVEL and falls back to info', () => {
    const original = process.env.MCP_LOG_LEVEL;
    try {
      const lines: string[] = [];
      process.env.MCP_LOG_LEVEL = 'error';
      createLogger({ sink: (line) => lines.push(line) }).warn('hidden');
      process.env.MCP_LOG_LEVEL = 'not-a-level';
      const fallback = createLogger({ sink: (line) => lines.push(line) });
      fallback.debug('hidden');
      fallback.info('shown');
      expect(lines.map((line) => JSON.parse(line).event)).toEqual(['shown']);
    } finally {
      if (original === undefined) delete process.env.MCP_LOG_LEVEL;
      else process.env.MCP_LOG_LEVEL = original;
    }
  });

  it('does not let a field overwrite the standard fields', () => {
    const { logger, entries } = capture();
    logger.info('real_event', { event: 'spoofed', level: 'error', service: 'other', timestamp: 'never' });
    expect(entries()[0]).toMatchObject({ event: 'real_event', level: 'info', service: 'focusware-mcp' });
    expect(entries()[0].timestamp).toBe('2026-10-11T00:00:00.000Z');
  });

  it('keeps a multi-line value on a single log line', () => {
    const { logger, lines } = capture();
    logger.info('event', { reason: 'first\n{"level":"error","event":"forged"}' });
    expect(lines).toHaveLength(1);
    expect(lines[0].split('\n')).toHaveLength(1);
  });

  it('never throws when the sink fails', () => {
    const logger = createLogger({
      sink: () => {
        throw new Error('disk full');
      },
    });
    expect(() => logger.error('event', { status: 500 })).not.toThrow();
  });
});

describe('redact', () => {
  it.each([
    'authorization',
    'Authorization',
    'cookie',
    'set-cookie',
    'token',
    'access_token',
    'clientToken',
    'backendToken',
    'refresh_token',
    'client_secret',
    'AUTH0_MANAGEMENT_CLIENT_SECRET',
    'password',
    'code',
    'code_verifier',
    'code_challenge',
    'INTERNAL_SERVICE_KEY',
    'x-internal-service-key',
    'api_key',
    'private_key',
    'signature',
  ])('removes the credential field %s', (key) => {
    expect(redact({ [key]: 'value-that-must-not-be-logged' })).toEqual({ [key]: REDACTED });
  });

  it.each(['content', 'details', 'objective', 'title', 'label', 'note', 'notes', 'body', 'arguments', 'params'])(
    'removes the task content field %s',
    (key) => {
      expect(redact({ [key]: 'Private task text' })).toEqual({ [key]: REDACTED });
    },
  );

  it('keeps the operational fields the adapter logs', () => {
    const fields = {
      request_id: '0b0e8f6c-6a53-4f0e-9d0b-3d0f0f6a2f11',
      http_method: 'POST',
      route: '/mcp',
      status: 403,
      duration_ms: 4,
      outcome: 'insufficient_scope',
      rpc_method: 'tools/call',
      tool: 'focusware_add_assigned_task_note',
      error_code: 'backend_unauthorized',
      error_name: 'TokenExpiredError',
      subject_hash: '0a041b9462caa4a3',
    };
    expect(redact(fields)).toEqual(fields);
  });

  it('scrubs tokens that appear inside otherwise safe values', () => {
    const safe = JSON.stringify(
      redact({
        reason: `request failed with Bearer ${jwt}`,
        url: `https://api.example/mcp/tasks?access=${jwt}`,
        nested: { list: [`Basic dXNlcjpwYXNz`, { inner: jwt }] },
      }),
    );
    expect(safe).not.toContain(jwt);
    expect(safe).not.toContain('eyJhbGci');
    expect(safe).not.toContain('dXNlcjpwYXNz');
    expect(safe).toContain(`Bearer ${REDACTED}`);
  });

  it('redacts nested credential fields and bounds size and depth', () => {
    const cyclic: Record<string, unknown> = { name: 'loop' };
    cyclic.self = cyclic;
    const safe = redact({
      request: { headers: { authorization: `Bearer ${jwt}` }, meta: { token: jwt } },
      long: 'x'.repeat(5000),
      many: Array.from({ length: 500 }, (_, index) => index),
      cyclic,
    }) as Record<string, any>;
    const text = JSON.stringify(safe);
    expect(text).not.toContain(jwt);
    expect(safe.request.headers).toBe(REDACTED);
    expect(safe.request.meta.token).toBe(REDACTED);
    expect(safe.long.length).toBeLessThan(300);
    expect(safe.many).toHaveLength(20);
    expect(text).toContain('[TRUNCATED]');
  });

  it('reduces errors to their class name', () => {
    const error = new Error(`upstream rejected Bearer ${jwt} for user-1`);
    expect(redact({ error })).toEqual({ error: { error_name: 'Error' } });
    expect(JSON.stringify(redact(error))).not.toContain('user-1');
  });
});

describe('describeError', () => {
  it('keeps the fixed adapter error code and drops the message', () => {
    expect(describeError(new BackendError('backend_unauthorized', 401))).toEqual({
      error_name: 'Error',
      error_code: 'backend_unauthorized',
    });
    const leaky = Object.assign(new TypeError(`bad token ${jwt}`), { code: `Bearer ${jwt}` });
    expect(describeError(leaky)).toEqual({ error_name: 'TypeError' });
    expect(describeError('a string was thrown')).toEqual({ error_name: 'NonError' });
  });
});

describe('hashSubject', () => {
  it('is stable, differs per user, and does not contain the user ID', () => {
    expect(hashSubject('auth0|user-1')).toBe(hashSubject('auth0|user-1'));
    expect(hashSubject('auth0|user-1')).not.toBe(hashSubject('auth0|user-2'));
    expect(hashSubject('auth0|user-1')).toMatch(/^[0-9a-f]{16}$/);
    expect(hashSubject('auth0|user-1')).not.toContain('user-1');
  });
});
