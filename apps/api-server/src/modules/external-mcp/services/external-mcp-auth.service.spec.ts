import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ExternalMcpAuthService } from './external-mcp-auth.service';
import { ExternalApiTokenRepository } from '../repositories/external-api-token.repository';
import { ScryptService } from '@app/crypto';

describe('ExternalMcpAuthService', () => {
  let service: ExternalMcpAuthService;

  const mockUserId = 'user-uuid-1234';
  const mockTokenId = 'token-uuid-5678';

  const externalApiTokenRepositoryMock = {
    create: jest.fn(),
    findByUserId: jest.fn(),
    findByUserIdAndId: jest.fn(),
    deleteByUserIdAndId: jest.fn(),
  };

  const scryptServiceMock = {
    hash: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalMcpAuthService,
        { provide: ExternalApiTokenRepository, useValue: externalApiTokenRepositoryMock },
        { provide: ScryptService, useValue: scryptServiceMock },
      ],
    }).compile();

    service = module.get<ExternalMcpAuthService>(ExternalMcpAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('issueToken', () => {
    it('should create and return a token response with raw token', async () => {
      const dto: any = { scopes: ['tasks:read'], label: 'test' };

      scryptServiceMock.hash.mockResolvedValueOnce('hashed-token');

      const savedEntity = {
        id: mockTokenId,
        label: dto.label,
        scopes: dto.scopes,
        last_used_at: null,
        expires_at: null,
        created_at: new Date().toISOString(),
      };

      externalApiTokenRepositoryMock.create.mockResolvedValueOnce(savedEntity);

      // Call
      const result = await service.issueToken(mockUserId, dto);

      // Assertions
      expect(result).toHaveProperty('id', mockTokenId);
      expect(result).toHaveProperty('token');
      expect(result.token).toHaveLength(64);
      expect(externalApiTokenRepositoryMock.create).toHaveBeenCalled();
      expect(scryptServiceMock.hash).toHaveBeenCalled();
    });
  });

  describe('listTokens', () => {
    it('should map tokens to response DTOs', async () => {
      const repoTokens = [
        {
          id: mockTokenId,
          label: 'label1',
          scopes: ['tasks:read'],
          last_used_at: null,
          expires_at: null,
          created_at: new Date().toISOString(),
        },
      ];

      externalApiTokenRepositoryMock.findByUserId.mockResolvedValueOnce(repoTokens);

      const result = await service.listTokens(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', mockTokenId);
      expect(externalApiTokenRepositoryMock.findByUserId).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('revokeToken', () => {
    it('should delete token when it exists', async () => {
      externalApiTokenRepositoryMock.findByUserIdAndId.mockResolvedValueOnce({ id: mockTokenId });
      externalApiTokenRepositoryMock.deleteByUserIdAndId.mockResolvedValueOnce(undefined);

      await expect(service.revokeToken(mockUserId, mockTokenId)).resolves.toBeUndefined();

      expect(externalApiTokenRepositoryMock.findByUserIdAndId).toHaveBeenCalledWith(mockUserId, mockTokenId);
      expect(externalApiTokenRepositoryMock.deleteByUserIdAndId).toHaveBeenCalledWith(mockUserId, mockTokenId);
    });

    it('should throw NotFoundException when token missing', async () => {
      externalApiTokenRepositoryMock.findByUserIdAndId.mockResolvedValueOnce(null);

      await expect(service.revokeToken(mockUserId, mockTokenId)).rejects.toThrow(NotFoundException);
      expect(externalApiTokenRepositoryMock.deleteByUserIdAndId).not.toHaveBeenCalled();
    });
  });
});
