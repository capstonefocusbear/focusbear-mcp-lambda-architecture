import { createHash } from 'node:crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

export interface LoggerOptions {
  // 'silent' turns logging off. Defaults to MCP_LOG_LEVEL, then 'info'.
  level?: LogLevel | 'silent';
  // Receives one JSON document per event. Defaults to a line on stdout, which Lambda ships to CloudWatch.
  sink?: (line: string) => void;
  now?: () => Date;
}

export const REDACTED = '[REDACTED]';
const SERVICE = 'focusware-mcp';
const MAX_STRING = 256;
const MAX_DEPTH = 4;
const MAX_ITEMS = 20;
const order: Record<LogLevel | 'silent', number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

// Field names whose value is a credential, whatever the value looks like.
const credentialKey =
  /authorization|cookie|token|secret|passw(or)?d|credential|verifier|assertion|signature|jwt|api[-_]?key|service[-_]?key|private[-_]?key|^code$|auth[-_]?code|code[-_]?challenge|^key$/i;
// Field names that carry task content or raw request/response payloads.
const contentKey =
  /^(content|details|objective|title|label|notes?|body|payload|arguments|args|params|result|headers|query)$/i;
const jwtValue = /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g;
const bearerValue = /\b(Bearer|Basic)\s+[^\s"',;]+/gi;

function redactString(value: string): string {
  const clean = value.replace(jwtValue, REDACTED).replace(bearerValue, `$1 ${REDACTED}`);
  return clean.length > MAX_STRING ? `${clean.slice(0, MAX_STRING)}...[truncated]` : clean;
}

// Returns a copy that is safe to write to logs. This is the second line of defence: call sites should
// already pass only safe fields, and this keeps a mistake at a call site from leaking a secret.
export function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value === undefined) return undefined;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'bigint') return value.toString();
  if (typeof value !== 'object') return `[${typeof value}]`;
  // Error messages can quote URLs, tokens, or backend bodies, so only the class name is kept.
  if (value instanceof Error) return { error_name: value.name };
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return '[TRUNCATED]';
  if (Array.isArray(value)) return value.slice(0, MAX_ITEMS).map((item) => redact(item, depth + 1));
  if (value instanceof Set) return redact([...value], depth);
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return '[object]';
  const safe: LogFields = {};
  for (const [key, item] of Object.entries(value as LogFields).slice(0, MAX_ITEMS)) {
    safe[key] = credentialKey.test(key) || contentKey.test(key) ? REDACTED : redact(item, depth + 1);
  }
  return safe;
}

// Safe description of a thrown value: the class name, plus the code when it is one of our own fixed codes.
export function describeError(error: unknown): LogFields {
  if (!(error instanceof Error)) return { error_name: 'NonError' };
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && /^[a-z_]{1,64}$/.test(code)
    ? { error_name: error.name, error_code: code }
    : { error_name: error.name };
}

// Stable pseudonym so one user's requests can be correlated without writing the user ID to logs.
export function hashSubject(subject: string): string {
  return createHash('sha256').update(subject).digest('hex').slice(0, 16);
}

function configuredLevel(): LogLevel | 'silent' {
  const value = (process.env.MCP_LOG_LEVEL || '').trim().toLowerCase();
  return value in order ? (value as LogLevel | 'silent') : 'info';
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const threshold = order[options.level ?? configuredLevel()];
  const sink = options.sink ?? ((line: string) => void process.stdout.write(`${line}\n`));
  const now = options.now ?? (() => new Date());
  const write = (level: LogLevel, event: string, fields: LogFields = {}): void => {
    if (order[level] < threshold) return;
    try {
      // Standard fields are written first and a caller's field can never replace them.
      const { timestamp: _t, level: _l, service: _s, event: _e, ...rest } = redact(fields) as LogFields;
      sink(JSON.stringify({ timestamp: now().toISOString(), level, service: SERVICE, event, ...rest }));
    } catch {
      // Logging must never break a request.
    }
  };
  return {
    debug: (event, fields) => write('debug', event, fields),
    info: (event, fields) => write('info', event, fields),
    warn: (event, fields) => write('warn', event, fields),
    error: (event, fields) => write('error', event, fields),
  };
}

export const silentLogger: Logger = createLogger({ level: 'silent' });
