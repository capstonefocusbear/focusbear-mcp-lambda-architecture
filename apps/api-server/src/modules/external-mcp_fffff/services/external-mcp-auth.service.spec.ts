import { Test, TestingModule } from '@nestjs/testing';
import { GoneException, NotFoundException } from '@nestjs/common';
import { ExternalMcpAuthService } from './external-mcp-auth.service';
import { ExternalApiTokenRepository } from '../repositories/external-api-token.repository';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalMcpAuthService,
        { provide: ExternalApiTokenRepository, useValue: externalApiTokenRepositoryMock },
      ],
    }).compile();

    service = module.get<ExternalMcpAuthService>(ExternalMcpAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects legacy issuance without creating a credential', async () => {
    await expect(service.issueToken(mockUserId, { scopes: ['tasks:read'] } as any)).rejects.toThrow(GoneException);
    expect(externalApiTokenRepositoryMock.create).not.toHaveBeenCalled();
  });

  describe('listTokens', () => {
    it('should map tokens to response DTOs including agent_name', async () => {
      const repoTokens = [
        {
          id: mockTokenId,
          label: 'label1',
          agent_name: 'Captain Codebeard',
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
      expect(result[0]).toHaveProperty('agent_name', 'Captain Codebeard');
      expect(externalApiTokenRepositoryMock.findByUserId).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('listAgents', () => {
    it('should return only tokens with agent_name set', async () => {
      const repoTokens = [
        {
          id: 'token-agent-1',
          label: 'Agent Token',
          agent_name: 'Captain Codebeard',
          scopes: ['tasks:read', 'tasks:write'],
          last_used_at: null,
          expires_at: null,
          created_at: new Date().toISOString(),
        },
        {
          id: 'token-human-1',
          label: 'Human Token',
          agent_name: undefined,
          scopes: ['tasks:read'],
          last_used_at: null,
          expires_at: null,
          created_at: new Date().toISOString(),
        },
      ];

      externalApiTokenRepositoryMock.findByUserId.mockResolvedValueOnce(repoTokens);

      const result = await service.listAgents(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'token-agent-1');
      expect(result[0]).toHaveProperty('agent_name', 'Captain Codebeard');
    });

    it('should return empty array when no agent tokens exist', async () => {
      externalApiTokenRepositoryMock.findByUserId.mockResolvedValueOnce([]);

      const result = await service.listAgents(mockUserId);

      expect(result).toHaveLength(0);
    });

    it('should exclude agent tokens whose expires_at is in the past', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
      const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour from now

      const repoTokens = [
        {
          id: 'token-expired',
          label: 'Expired Agent',
          agent_name: 'Expired Bot',
          scopes: ['tasks:read'],
          last_used_at: null,
          expires_at: pastDate,
          created_at: new Date().toISOString(),
        },
        {
          id: 'token-valid',
          label: 'Valid Agent',
          agent_name: 'Active Bot',
          scopes: ['tasks:read', 'tasks:write'],
          last_used_at: null,
          expires_at: futureDate,
          created_at: new Date().toISOString(),
        },
        {
          id: 'token-no-expiry',
          label: 'No Expiry Agent',
          agent_name: 'Permanent Bot',
          scopes: ['tasks:read'],
          last_used_at: null,
          expires_at: null,
          created_at: new Date().toISOString(),
        },
      ];

      externalApiTokenRepositoryMock.findByUserId.mockResolvedValueOnce(repoTokens);

      const result = await service.listAgents(mockUserId);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).not.toContain('token-expired');
      expect(result.map((r) => r.id)).toContain('token-valid');
      expect(result.map((r) => r.id)).toContain('token-no-expiry');
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
