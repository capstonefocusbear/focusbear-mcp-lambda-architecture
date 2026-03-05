import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { ScryptService } from '@app/crypto';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { OpenclawToken } from '../entities/openclaw-token.entity';

@Injectable()
export class OpenclawTokenRepository extends BaseRepository<OpenclawToken> {
  constructor(
    dataSource: DataSource,
    private readonly scryptService: ScryptService,
  ) {
    super(dataSource, OpenclawToken);
  }

  async findByUserId(userId: string): Promise<OpenclawToken[]> {
    return this.orm.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async findByUserIdAndId(userId: string, id: string): Promise<OpenclawToken | null> {
    return this.orm.findOne({ where: { user_id: userId, id } });
  }

  /**
   * Look up a token by raw value.
   * Uses the token_prefix index for efficient candidate selection,
   * then scrypt verify to validate the full token hash.
   */
  async findByRawToken(rawToken: string): Promise<OpenclawToken | null> {
    // Derive the same SHA-256-based prefix used at issuance for efficient index lookup
    const prefix = crypto.createHash('sha256').update(rawToken).digest('hex').substring(0, 16);
    const candidates = await this.orm.find({ where: { token_prefix: prefix } });

    for (const candidate of candidates) {
      const isMatch = await this.scryptService.verify(rawToken, candidate.token_hash);
      if (isMatch) {
        return candidate;
      }
    }
    return null;
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.orm.update(id, { last_used_at: new Date() });
  }

  async deleteByUserIdAndId(userId: string, id: string): Promise<void> {
    await this.orm.delete({ user_id: userId, id });
  }
}
