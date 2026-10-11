import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { ExternalApiTokenRepository } from '../repositories/external-api-token.repository';
import { CreateExternalApiTokenDto } from '../dto/create-external-api-token.dto';
import { ExternalApiTokenIssuedResponseDto, ExternalApiTokenResponseDto } from '../dto/external-api-token-response.dto';
import { McpAgentResponseDto } from '../dto/mcp-agent-response.dto';

@Injectable()
export class ExternalMcpAuthService {
  constructor(private readonly externalApiTokenRepository: ExternalApiTokenRepository) {}

  async issueToken(_userId: string, _dto: CreateExternalApiTokenDto): Promise<ExternalApiTokenIssuedResponseDto> {
    throw new GoneException('Use /oauth/authorize');
  }

  async listTokens(userId: string): Promise<ExternalApiTokenResponseDto[]> {
    const tokens = await this.externalApiTokenRepository.findByUserId(userId);
    return tokens.map((t) => ({
      id: t.id,
      label: t.label,
      agent_name: t.agent_name,
      scopes: t.scopes,
      last_used_at: t.last_used_at,
      expires_at: t.expires_at,
      created_at: t.created_at,
    }));
  }

  async listAgents(userId: string): Promise<McpAgentResponseDto[]> {
    const tokens = await this.externalApiTokenRepository.findByUserId(userId);
    // Return only tokens that have an agent_name and are not expired — these represent active AI agents
    return tokens
      .filter((t) => t.agent_name && (!t.expires_at || new Date(t.expires_at) > new Date()))
      .map((t) => ({
        id: t.id,
        agent_name: t.agent_name,
        label: t.label,
        scopes: t.scopes,
        created_at: t.created_at,
      }));
  }

  async revokeToken(userId: string, tokenId: string): Promise<void> {
    const existing = await this.externalApiTokenRepository.findByUserIdAndId(userId, tokenId);
    if (!existing) {
      throw new NotFoundException('Token not found');
    }
    await this.externalApiTokenRepository.deleteByUserIdAndId(userId, tokenId);
  }
}
