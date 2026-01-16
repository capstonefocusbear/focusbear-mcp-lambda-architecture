import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';

@Injectable()
export class ApiKeyRepository {
  public readonly orm: Repository<ApiKey>;

  constructor(private readonly dataSource: DataSource) {
    this.orm = this.dataSource.getRepository(ApiKey);
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return this.orm.findOne({
      where: { key_hash: keyHash, is_active: true },
    });
  }

  async findByUserId(userId: string): Promise<ApiKey[]> {
    return this.orm.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async findActiveByUserId(userId: string): Promise<ApiKey[]> {
    return this.orm.find({
      where: { user_id: userId, is_active: true },
      order: { created_at: 'DESC' },
    });
  }
}
