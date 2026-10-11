import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

export const opaque = () => randomBytes(32).toString('base64url');
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export interface Grant {
  id: string;
  user_id: string;
  client_id: string;
  agent_label: string;
  scopes: string[];
  revoked_at: string | null;
}

@Injectable()
export class OAuthStore {
  constructor(private readonly db: DataSource) {}

  async available<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (err) {
      // Domain failures are already sanitized; never expose database diagnostics.
      if (err?.getStatus) throw err;
      throw new ServiceUnavailableException({ error: 'temporarily_unavailable' });
    }
  }

  private encrypt(kind: string, payload: unknown): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(process.env.OAUTH_STATE_ENCRYPTION_KEY, 'hex'), iv);
    cipher.setAAD(Buffer.from(kind));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
  }

  private decrypt<T>(kind: string, payload: string): T {
    const bytes = Buffer.from(payload, 'base64');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(process.env.OAUTH_STATE_ENCRYPTION_KEY, 'hex'),
      bytes.subarray(0, 12),
    );
    decipher.setAuthTag(bytes.subarray(12, 28));
    decipher.setAAD(Buffer.from(kind));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
  }

  async put(kind: string, payload: unknown, seconds: number): Promise<string> {
    const handle = opaque();
    await this.available(() => this.db.query('DELETE FROM mcp_oauth_handles WHERE expires_at <= now()'));
    await this.available(() =>
      this.db.query(
        `INSERT INTO mcp_oauth_handles (hash, kind, payload, expires_at) VALUES ($1, $2, $3, now() + $4 * interval '1 second')`,
        [digest(handle), kind, this.encrypt(kind, payload), seconds],
      ),
    );
    return handle;
  }

  async take<T>(kind: string, handle: string): Promise<T | undefined> {
    const rows = await this.available(() =>
      this.db.query(
        `WITH consumed AS (DELETE FROM mcp_oauth_handles WHERE hash = $1 AND kind = $2 RETURNING payload, expires_at) SELECT payload, expires_at > now() AS active FROM consumed`,
        [digest(handle), kind],
      ),
    );
    return rows[0]?.active ? this.available(async () => this.decrypt<T>(kind, rows[0].payload)) : undefined;
  }

  async reserveAssertion(clientId: string, jti: string, expiresAt: number): Promise<boolean> {
    return this.available(async () => {
      await this.db.query('DELETE FROM mcp_oauth_assertions WHERE expires_at <= now()');
      const rows = await this.db.query(
        'INSERT INTO mcp_oauth_assertions (hash, expires_at) VALUES ($1, to_timestamp($2)) ON CONFLICT DO NOTHING RETURNING hash',
        [digest(JSON.stringify([clientId, jti])), expiresAt],
      );
      return rows.length === 1;
    });
  }

  async userForSubject(subject: string): Promise<string | undefined> {
    const rows = await this.available(() => this.db.query('SELECT id FROM users WHERE auth0_id = $1', [subject]));
    // Ambiguous mappings also fail closed.
    return rows.length === 1 ? rows[0].id : undefined;
  }

  async grants(userId: string, clientId: string): Promise<Grant[]> {
    return this.available(() =>
      this.db.query(
        'SELECT id, user_id, client_id, agent_label, scopes, revoked_at FROM mcp_oauth_grants WHERE user_id = $1 AND client_id = $2 AND revoked_at IS NULL',
        [userId, clientId],
      ),
    );
  }

  async transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.available(() => this.db.transaction(work));
  }
}
