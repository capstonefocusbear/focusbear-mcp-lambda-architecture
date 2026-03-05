import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ScryptService } from '@app/crypto';
import { OpenclawTokenRepository } from '../repositories/openclaw-token.repository';
import { OpenclawToken } from '../entities/openclaw-token.entity';
import { CreateOpenclawTokenDto } from '../dto/create-openclaw-token.dto';
import { OpenclawTokenIssuedResponseDto, OpenclawTokenResponseDto } from '../dto/openclaw-token-response.dto';

@Injectable()
export class OpenclawMcpAuthService {
  constructor(
    private readonly openclawTokenRepository: OpenclawTokenRepository,
    private readonly scryptService: ScryptService,
  ) {}

  async issueToken(userId: string, dto: CreateOpenclawTokenDto): Promise<OpenclawTokenIssuedResponseDto> {
    // Generate a cryptographically random 64-char hex token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenPrefix = rawToken.substring(0, 8);
    const tokenHash = await this.scryptService.hash(rawToken);

    const entity = new OpenclawToken(
      {
        user_id: userId,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        scopes: dto.scopes,
        label: dto.label,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { generateId: true },
    );

    const saved = await this.openclawTokenRepository.create(entity);

    return {
      id: saved.id,
      token: rawToken, // Raw token returned ONCE only — never stored in plaintext
      label: saved.label,
      scopes: saved.scopes,
      last_used_at: saved.last_used_at,
      expires_at: saved.expires_at,
      created_at: saved.created_at,
    };
  }

  async listTokens(userId: string): Promise<OpenclawTokenResponseDto[]> {
    const tokens = await this.openclawTokenRepository.findByUserId(userId);
    return tokens.map((t) => ({
      id: t.id,
      label: t.label,
      scopes: t.scopes,
      last_used_at: t.last_used_at,
      expires_at: t.expires_at,
      created_at: t.created_at,
    }));
  }

  async revokeToken(userId: string, tokenId: string): Promise<void> {
    const existing = await this.openclawTokenRepository.findByUserIdAndId(userId, tokenId);
    if (!existing) {
      throw new NotFoundException(`Token not found`);
    }
    await this.openclawTokenRepository.deleteByUserIdAndId(userId, tokenId);
  }
}
