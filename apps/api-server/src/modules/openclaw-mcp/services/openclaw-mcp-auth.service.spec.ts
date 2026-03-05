import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OpenclawMcpAuthService } from './openclaw-mcp-auth.service';
import { OpenclawTokenRepository } from '../repositories/openclaw-token.repository';
import { ScryptService } from '@app/crypto';

describe('OpenclawMcpAuthService', () => {
  let service: OpenclawMcpAuthService;

  const mockUserId = 'user-uuid-1234';
  const mockTokenId = 'token-uuid-5678';

  const openclawTokenRepositoryMock = {
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
        OpenclawMcpAuthService,
        { provide: OpenclawTokenRepository, useValue: openclawTokenRepositoryMock },
        { provide: ScryptService, useValue: scryptServiceMock },
      ],
    }).compile();

    service = module.get<OpenclawMcpAuthService>(OpenclawMcpAuthService);
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

      openclawTokenRepositoryMock.create.mockResolvedValueOnce(savedEntity);

      // Call
      const result = await service.issueToken(mockUserId, dto);

      // Assertions
      expect(result).toHaveProperty('id', mockTokenId);
      expect(result).toHaveProperty('token');
      expect(result.token).toHaveLength(64);
      expect(openclawTokenRepositoryMock.create).toHaveBeenCalled();
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

      openclawTokenRepositoryMock.findByUserId.mockResolvedValueOnce(repoTokens);

      const result = await service.listTokens(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', mockTokenId);
      expect(openclawTokenRepositoryMock.findByUserId).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('revokeToken', () => {
    it('should delete token when it exists', async () => {
      openclawTokenRepositoryMock.findByUserIdAndId.mockResolvedValueOnce({ id: mockTokenId });
      openclawTokenRepositoryMock.deleteByUserIdAndId.mockResolvedValueOnce(undefined);

      await expect(service.revokeToken(mockUserId, mockTokenId)).resolves.toBeUndefined();

      expect(openclawTokenRepositoryMock.findByUserIdAndId).toHaveBeenCalledWith(mockUserId, mockTokenId);
      expect(openclawTokenRepositoryMock.deleteByUserIdAndId).toHaveBeenCalledWith(mockUserId, mockTokenId);
    });

    it('should throw NotFoundException when token missing', async () => {
      openclawTokenRepositoryMock.findByUserIdAndId.mockResolvedValueOnce(null);

      await expect(service.revokeToken(mockUserId, mockTokenId)).rejects.toThrow(NotFoundException);
      expect(openclawTokenRepositoryMock.deleteByUserIdAndId).not.toHaveBeenCalled();
    });
  });
});
