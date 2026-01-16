import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SentryService } from '@app/observability';
import { ApiKeyService } from './api-key.service';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { ApiKey } from '../entities/api-key.entity';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let apiKeyRepository: jest.Mocked<ApiKeyRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockApiKeyId = '987fcdeb-51a2-3b4c-5d6e-7f8a9b0c1d2e';

  const mockSentryInstance = {
    addBreadcrumb: jest.fn(),
    captureException: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: ApiKeyRepository,
          useValue: {
            orm: {
              save: jest.fn(),
              findOne: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            findByKeyHash: jest.fn(),
            findByUserId: jest.fn(),
          },
        },
        {
          provide: SentryService,
          useValue: {
            instance: jest.fn().mockReturnValue(mockSentryInstance),
          },
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    apiKeyRepository = module.get(ApiKeyRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createApiKey', () => {
    it('should create a new API key', async () => {
      const createDto = { name: 'Test API Key' };
      const savedKey = {
        id: mockApiKeyId,
        user_id: mockUserId,
        name: createDto.name,
        key_prefix: 'fb_live_',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      apiKeyRepository.orm.save.mockResolvedValue(savedKey as ApiKey);

      const result = await service.createApiKey(mockUserId, createDto);

      expect(result).toHaveProperty('id', mockApiKeyId);
      expect(result).toHaveProperty('name', createDto.name);
      expect(result).toHaveProperty('api_key');
      expect(result.api_key).toMatch(/^fb_live_/);
      expect(apiKeyRepository.orm.save).toHaveBeenCalled();
    });

    it('should create an API key with expiration date', async () => {
      const expiresAt = '2025-12-31T23:59:59Z';
      const createDto = { name: 'Test API Key', expires_at: expiresAt };
      const savedKey = {
        id: mockApiKeyId,
        user_id: mockUserId,
        name: createDto.name,
        key_prefix: 'fb_live_',
        is_active: true,
        expires_at: new Date(expiresAt),
        created_at: new Date().toISOString(),
      };

      apiKeyRepository.orm.save.mockResolvedValue(savedKey as ApiKey);

      const result = await service.createApiKey(mockUserId, createDto);

      expect(result).toHaveProperty('expires_at');
      expect(apiKeyRepository.orm.save).toHaveBeenCalled();
    });
  });

  describe('getApiKeys', () => {
    it('should return all API keys for a user', async () => {
      const mockKeys = [
        {
          id: mockApiKeyId,
          user_id: mockUserId,
          name: 'Key 1',
          key_prefix: 'fb_live_',
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: '456',
          user_id: mockUserId,
          name: 'Key 2',
          key_prefix: 'fb_live_',
          is_active: false,
          created_at: new Date().toISOString(),
        },
      ];

      apiKeyRepository.findByUserId.mockResolvedValue(mockKeys as ApiKey[]);

      const result = await service.getApiKeys(mockUserId);

      expect(result).toHaveLength(2);
      expect(apiKeyRepository.findByUserId).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an API key', async () => {
      const mockKey = {
        id: mockApiKeyId,
        user_id: mockUserId,
        is_active: true,
      };

      apiKeyRepository.orm.findOne.mockResolvedValue(mockKey as ApiKey);
      apiKeyRepository.orm.update.mockResolvedValue({ affected: 1 } as any);

      await service.revokeApiKey(mockUserId, mockApiKeyId);

      expect(apiKeyRepository.orm.update).toHaveBeenCalledWith(
        mockApiKeyId,
        expect.objectContaining({ is_active: false }),
      );
    });

    it('should throw NotFoundException if API key not found', async () => {
      apiKeyRepository.orm.findOne.mockResolvedValue(null);

      await expect(service.revokeApiKey(mockUserId, mockApiKeyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteApiKey', () => {
    it('should delete an API key', async () => {
      const mockKey = {
        id: mockApiKeyId,
        user_id: mockUserId,
      };

      apiKeyRepository.orm.findOne.mockResolvedValue(mockKey as ApiKey);
      apiKeyRepository.orm.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteApiKey(mockUserId, mockApiKeyId);

      expect(apiKeyRepository.orm.delete).toHaveBeenCalledWith(mockApiKeyId);
    });

    it('should throw NotFoundException if API key not found', async () => {
      apiKeyRepository.orm.findOne.mockResolvedValue(null);

      await expect(service.deleteApiKey(mockUserId, mockApiKeyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateApiKey', () => {
    it('should return null for invalid key format', async () => {
      const result = await service.validateApiKey('invalid_key');

      expect(result).toBeNull();
    });

    it('should return null for non-existent key', async () => {
      apiKeyRepository.findByKeyHash.mockResolvedValue(null);

      const result = await service.validateApiKey('fb_live_abc123');

      expect(result).toBeNull();
    });

    it('should return null for expired key', async () => {
      const expiredKey = {
        id: mockApiKeyId,
        user_id: mockUserId,
        expires_at: new Date('2020-01-01'),
        is_active: true,
      };

      apiKeyRepository.findByKeyHash.mockResolvedValue(expiredKey as ApiKey);

      const result = await service.validateApiKey('fb_live_abc123');

      expect(result).toBeNull();
    });

    it('should return API key and update last_used_at for valid key', async () => {
      const validKey = {
        id: mockApiKeyId,
        user_id: mockUserId,
        is_active: true,
        expires_at: null,
      };

      apiKeyRepository.findByKeyHash.mockResolvedValue(validKey as ApiKey);
      apiKeyRepository.orm.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.validateApiKey('fb_live_abc123');

      expect(result).toEqual(validKey);
      expect(apiKeyRepository.orm.update).toHaveBeenCalledWith(
        mockApiKeyId,
        expect.objectContaining({ last_used_at: expect.any(Date) }),
      );
    });
  });
});
