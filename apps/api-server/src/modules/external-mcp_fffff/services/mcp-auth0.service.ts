import { ForbiddenException, Injectable, OnModuleDestroy, UnauthorizedException, HttpException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { createMcpAuthVerifier, loadMcpAuthConfig } from '@app/jwt/mcp-auth0';

/** Auth0 resource server. No user or agent header is trusted. */
@Injectable()
export class McpAuth0Service implements OnModuleDestroy {
  private readonly verifier =
    process.env.MCP_AUTH0_ENABLED === 'true' ? createMcpAuthVerifier(loadMcpAuthConfig()) : undefined;
  private redis?: Redis;
  constructor(private readonly dataSource: DataSource) {}

  async authenticate(request: any, token: string): Promise<void> {
    if (!this.verifier) throw new UnauthorizedException('Auth0 MCP is disabled');
    let identity;
    try {
      identity = await this.verifier.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid MCP access token');
    }
    const [user] = await this.dataSource.query('SELECT id FROM users WHERE auth0_id = $1', [identity.subject]);
    if (!user) throw new UnauthorizedException('Unknown MCP user');
    const agent = await this.resolveConnection(user.id, identity.issuer, identity.clientId);
    await this.limit(user.id);
    request.mcpUserId = user.id;
    request.mcpTokenId = agent.id;
    request.mcpScopes = [...identity.scopes].filter((scope) => scope.startsWith('mcp.'));
    request.mcpAuthMode = 'auth0';
  }

  async resolveConnection(userId: string, issuer: string, clientId: string) {
    // ON CONFLICT DO NOTHING never re-enables or renames an existing connection.
    await this.dataSource.query(
      `INSERT INTO mcp_agent_connections (user_id, issuer, client_id, display_name)
      VALUES ($1, $2, $3, $3) ON CONFLICT (user_id, issuer, client_id) DO NOTHING`,
      [userId, issuer, clientId],
    );
    const [agent] = await this.dataSource.query(
      `SELECT * FROM mcp_agent_connections WHERE user_id=$1 AND issuer=$2 AND client_id=$3`,
      [userId, issuer, clientId],
    );
    if (!agent || agent.status !== 'active') throw new ForbiddenException('MCP connection is disabled');
    return agent;
  }

  private async limit(userId: string) {
    this.redis ??= new Redis({
      host: process.env.REDIS_HOSTNAME,
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      commandTimeout: 2000,
      enableOfflineQueue: true,
    });
    const count = Number(
      await this.redis.eval(
        `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('PEXPIRE', KEYS[1], 60000) end; return n`,
        1,
        `mcp:user:${userId}`,
      ),
    );
    if (count > 60) throw new HttpException('MCP user rate limit exceeded', 429);
  }
  onModuleDestroy() {
    this.redis?.disconnect();
  }
}
