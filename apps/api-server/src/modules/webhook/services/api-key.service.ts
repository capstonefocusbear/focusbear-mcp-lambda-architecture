import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { InjectSentry, SentryService } from '@app/observability';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { ApiKey } from '../entities/api-key.entity';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { ApiKeyResponseDto } from '../dto/api-key-response.dto';
import { ApiKeyCreatedResponseDto } from '../dto/api-key-created-response.dto';

@Injectable()
export class ApiKeyService {
  private readonly API_KEY_PREFIX = 'fb_live_';

  constructor(
    private readonly apiKeyRepository: ApiKeyRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async createApiKey(userId: string, createApiKeyDto: CreateApiKeyDto): Promise<ApiKeyCreatedResponseDto> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Creating API key',
      data: { userId, name: createApiKeyDto.name },
    });

    const rawKey = this.generateApiKey();
    const keyHash = this.hashApiKey(rawKey);
    const keyPrefix = rawKey.substring(0, 8);

    const apiKey = new ApiKey({
      user_id: userId,
      name: createApiKeyDto.name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      expires_at: createApiKeyDto.expires_at ? new Date(createApiKeyDto.expires_at) : null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const savedKey = await this.apiKeyRepository.orm.save(apiKey);

    return {
      id: savedKey.id,
      name: savedKey.name,
      key_prefix: savedKey.key_prefix,
      is_active: savedKey.is_active,
      expires_at: savedKey.expires_at?.toISOString(),
      created_at: savedKey.created_at,
      api_key: rawKey,
    };
  }

  async getApiKeys(userId: string): Promise<ApiKeyResponseDto[]> {
    const apiKeys = await this.apiKeyRepository.findByUserId(userId);

    return apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      key_prefix: key.key_prefix,
      is_active: key.is_active,
      expires_at: key.expires_at?.toISOString(),
      last_used_at: key.last_used_at?.toISOString(),
      created_at: key.created_at,
    }));
  }

  async revokeApiKey(userId: string, apiKeyId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.orm.findOne({
      where: { id: apiKeyId, user_id: userId },
    });

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${apiKeyId} not found`);
    }

    await this.apiKeyRepository.orm.update(apiKeyId, { is_active: false, updated_at: new Date().toISOString() });

    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'info',
      message: 'API key revoked',
      data: { userId, apiKeyId },
    });
  }

  async deleteApiKey(userId: string, apiKeyId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.orm.findOne({
      where: { id: apiKeyId, user_id: userId },
    });

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${apiKeyId} not found`);
    }

    await this.apiKeyRepository.orm.delete(apiKeyId);

    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'info',
      message: 'API key deleted',
      data: { userId, apiKeyId },
    });
  }

  async validateApiKey(rawKey: string): Promise<ApiKey | null> {
    if (!rawKey || !rawKey.startsWith(this.API_KEY_PREFIX)) {
      return null;
    }

    const keyHash = this.hashApiKey(rawKey);
    const apiKey = await this.apiKeyRepository.findByKeyHash(keyHash);

    if (!apiKey) {
      return null;
    }

    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return null;
    }

    await this.apiKeyRepository.orm.update(apiKey.id, {
      last_used_at: new Date(),
      updated_at: new Date().toISOString(),
    });

    return apiKey;
  }

  private generateApiKey(): string {
    const randomPart = randomBytes(32).toString('hex');
    return `${this.API_KEY_PREFIX}${randomPart}`;
  }

  private hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }
}
