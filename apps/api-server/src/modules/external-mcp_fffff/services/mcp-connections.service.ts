import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** User-managed connections; pending revocation is a durable administrative work queue. */
@Injectable()
export class McpConnectionsService {
  constructor(private readonly dataSource: DataSource) {}

  async list(userId: string) {
    return this.dataSource.query(
      `SELECT id, id AS assigned_mcp_agent_id, display_name AS agent_name, label,
      ARRAY['mcp.tasks.read','mcp.tasks.write','mcp.summary.read']::text[] AS scopes, created_at, status,
      revocation_status FROM mcp_agent_connections WHERE user_id=$1 AND issuer <> 'legacy' ORDER BY created_at DESC`,
      [userId],
    );
  }

  async disconnect(userId: string, id: string) {
    const rows = await this.dataSource.query(
      `UPDATE mcp_agent_connections SET status='disabled',
      revocation_status='pending', revocation_evidence=NULL, updated_at=now() WHERE user_id=$1 AND id=$2 AND issuer <> 'legacy' RETURNING id`,
      [userId, id],
    );
    if (!rows.length) throw new NotFoundException('Connection not found');
    // The local block commits before any remote administrative operation is attempted.
    return { status: 'disabled', revocation_status: 'pending' };
  }

  async reconnect(userId: string, id: string) {
    const rows = await this.dataSource.query(
      `UPDATE mcp_agent_connections SET status='active',updated_at=now()
      WHERE user_id=$1 AND id=$2 AND issuer <> 'legacy' AND revocation_status <> 'pending' RETURNING id`,
      [userId, id],
    );
    if (!rows.length) throw new ForbiddenException('Owned connection must have completed revocation before reconnect');
  }

  async rename(userId: string, id: string, displayName: string) {
    await this.dataSource.transaction(async (manager) => {
      const [agent] = await manager.query(
        `UPDATE mcp_agent_connections SET display_name=$3,updated_at=now()
        WHERE user_id=$1 AND id=$2 RETURNING id, legacy_token_id`,
        [userId, id, displayName],
      );
      if (!agent) throw new NotFoundException('Connection not found');
      if (agent.legacy_token_id) {
        // Legacy dashboard responses still read the token's agent_name.
        await manager.query(`UPDATE external_api_tokens SET agent_name=$3 WHERE user_id=$1 AND id=$2`, [
          userId,
          agent.legacy_token_id,
          displayName,
        ]);
      }
    });
  }

  async link(userId: string, legacyTokenId: string, agentId: string) {
    await this.dataSource.transaction(async (manager) => {
      const [target] = await manager.query(
        `SELECT id FROM mcp_agent_connections WHERE user_id=$1 AND id=$2
        AND issuer <> 'legacy' AND status='active' FOR UPDATE`,
        [userId, agentId],
      );
      const [source] = await manager.query(`SELECT id FROM external_api_tokens WHERE user_id=$1 AND id=$2 FOR UPDATE`, [
        userId,
        legacyTokenId,
      ]);
      if (!target || !source) throw new NotFoundException('Owned connection not found');
      await manager.query(
        `UPDATE to_do SET assigned_mcp_agent_id=$3, assigned_mcp_token_id=NULL WHERE user_id=$1 AND assigned_mcp_token_id=$2`,
        [userId, legacyTokenId, agentId],
      );
    });
  }

  async pendingRevocations() {
    return this.dataSource
      .query(`SELECT a.id,a.issuer,a.client_id,to_char(a.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS revision,u.auth0_id AS subject FROM mcp_agent_connections a
      JOIN users u ON u.id=a.user_id WHERE a.status='disabled' AND a.revocation_status='pending'`);
  }

  /** Operator confirms after revoking ALL matching user/client grants and refresh access in Auth0. */
  async confirmRevocation(id: string, revision: string, evidence: string) {
    const rows = await this.dataSource.query(
      `UPDATE mcp_agent_connections SET revocation_status='complete',revocation_evidence=$3,updated_at=now()
      WHERE id=$1 AND status='disabled' AND revocation_status='pending' AND updated_at=$2::timestamptz RETURNING id`,
      [id, revision, evidence],
    );
    if (!rows.length) throw new BadRequestException('No pending revocation');
  }
}
