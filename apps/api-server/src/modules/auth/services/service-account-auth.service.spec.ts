import { Test, TestingModule } from '@nestjs/testing';
import { Auth0AuthenticationService } from '@app/auth0';
import { ServiceAccountAuthService } from './service-account-auth.service';
import { ServiceAccountPassport } from '../domain/service-account-passport.model';

describe('ServiceAccountAuthService', () => {
  let service: ServiceAccountAuthService;
  let mockAuth0Service: jest.Mocked<Auth0AuthenticationService>;

  const mockValidM2MToken = {
    iss: 'https://dev-2hidr8ad.us.auth0.com/',
    sub: 'KUnNASRMQfhP0Ew5jPvFU0WAfOyieTFk@clients',
    aud: 'https://focusbear.io/team-management',
    iat: 1754830432,
    exp: 1754916832,
    scope: 'admin:b9f1bce9-c130-4141-80d6-3bde32a66542',
    gty: 'client-credentials',
    azp: 'KUnNASRMQfhP0Ew5jPvFU0WAfOyieTFk',
  };

  const mockInvalidScopeToken = {
    ...mockValidM2MToken,
    scope: 'invalid-scope-format',
  };

  const mockInvalidActionToken = {
    ...mockValidM2MToken,
    scope: 'invalid:b9f1bce9-c130-4141-80d6-3bde32a66542',
  };

  const mockInvalidTeamIdToken = {
    ...mockValidM2MToken,
    scope: 'admin:invalid-team-id',
  };

  const mockUserToken = {
    ...mockValidM2MToken,
    gty: 'password',
  };

  const mockInvalidAudienceToken = {
    ...mockValidM2MToken,
    aud: 'https://different-audience.com',
  };

  beforeEach(async () => {
    const mockAuth0ServiceMock = {
      validateAccessToken: jest.fn(),
      validateServiceAccountToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceAccountAuthService,
        {
          provide: Auth0AuthenticationService,
          useValue: mockAuth0ServiceMock,
        },
      ],
    }).compile();

    service = module.get<ServiceAccountAuthService>(ServiceAccountAuthService);
    mockAuth0Service = module.get(Auth0AuthenticationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('authenticate', () => {
    it('should successfully authenticate a valid M2M token with admin scope', async () => {
      mockAuth0Service.validateServiceAccountToken.mockResolvedValue([true, { payload: mockValidM2MToken }]);

      const result = await service.authenticate({ authorization: 'Bearer valid.token.here' });

      expect(result).toBeInstanceOf(ServiceAccountPassport);
      expect(result.isAuth).toBe(true);
      expect(result.serviceAccount).toEqual({
        sub: 'KUnNASRMQfhP0Ew5jPvFU0WAfOyieTFk@clients',
        scope: 'admin:b9f1bce9-c130-4141-80d6-3bde32a66542',
        teamId: 'b9f1bce9-c130-4141-80d6-3bde32a66542',
        action: 'admin',
        aud: 'https://focusbear.io/team-management',
      });
    });

    it('should successfully authenticate a valid M2M token with read scope', async () => {
      const readToken = {
        ...mockValidM2MToken,
        scope: 'read:b9f1bce9-c130-4141-80d6-3bde32a66542',
      };
      mockAuth0Service.validateServiceAccountToken.mockResolvedValue([true, { payload: readToken }]);

      const result = await service.authenticate({ authorization: 'Bearer valid.token.here' });

      expect(result.isAuth).toBe(true);
      expect(result.serviceAccount.action).toBe('read');
    });

    it('should successfully authenticate a valid M2M token with write scope', async () => {
      const writeToken = {
        ...mockValidM2MToken,
        scope: 'write:b9f1bce9-c130-4141-80d6-3bde32a66542',
      };
      mockAuth0Service.validateServiceAccountToken.mockResolvedValue([true, { payload: writeToken }]);

      const result = await service.authenticate({ authorization: 'Bearer valid.token.here' });

      expect(result.isAuth).toBe(true);
      expect(result.serviceAccount.action).toBe('write');
    });

    it('should reject token with invalid scope format', async () => {
      mockAuth0Service.validateServiceAccountToken.mockResolvedValue([true, { payload: mockInvalidScopeToken }]);

      const result = await service.authenticate({ authorization: 'Bearer valid.token.here' });

      expect(result.isAuth).toBe(false);
      expect(result.declineReason).toBe('Invalid scope format');
    });

    it('should reject token with invalid action', async () => {
      mockAuth0Service.validateServiceAccountToken.mockResolvedValue([true, { payload: mockInvalidActionToken }]);

      const result = await service.authenticate({ authorization: 'Bearer valid.token.here' });

      expect(result.isAuth).toBe(false);
      expect(result.declineReason).toBe('Invalid scope format');
    });

    it('should reject token with invalid team ID format', async () => {
      mockAuth0Service.validateServiceAccountToken.mockResolvedValue([true, { payload: mockInvalidTeamIdToken }]);

      const result = await service.authenticate({ authorization: 'Bearer valid.token.here' });

      expect(result.isAuth).toBe(false);
      expect(result.declineReason).toBe('Invalid scope format');
    });

    it('should reject non-M2M tokens', async () => {
      mockAuth0Service.validateServiceAccountToken.mockResolvedValue([true, { payload: mockUserToken }]);

      const result = await service.authenticate({ authorization: 'Bearer valid.token.here' });

      expect(result.isAuth).toBe(false);
      expect(result.declineReason).toBe('Token is not a machine-to-machine token');
    });

    it('should reject tokens with invalid audience', async () => {
      mockAuth0Service.validateServiceAccountToken.mockResolvedValue([true, { payload: mockInvalidAudienceToken }]);

      const result = await service.authenticate({ authorization: 'Bearer valid.token.here' });

      expect(result.isAuth).toBe(false);
      expect(result.declineReason).toBe('Invalid audience for team management');
    });

    it('should reject invalid tokens', async () => {
      mockAuth0Service.validateServiceAccountToken.mockResolvedValue([false, { declineReason: 'Token expired' }]);

      const result = await service.authenticate({ authorization: 'Bearer invalid.token.here' });

      expect(result.isAuth).toBe(false);
      expect(result.declineReason).toBe('Token expired');
    });

    it('should handle missing authorization header', async () => {
      const result = await service.authenticate({ authorization: undefined });

      expect(result.isAuth).toBe(false);
      expect(result.declineReason).toContain('Authorization header missing');
    });

    it('should handle malformed authorization header', async () => {
      const result = await service.authenticate({ authorization: 'InvalidFormat' });

      expect(result.isAuth).toBe(false);
      expect(result.declineReason).toContain('Bearer token missing');
    });

    it('should handle Auth0 service errors gracefully', async () => {
      mockAuth0Service.validateServiceAccountToken.mockRejectedValue(new Error('Auth0 service error'));

      const result = await service.authenticate({ authorization: 'Bearer valid.token.here' });

      expect(result.isAuth).toBe(false);
      expect(result.declineReason).toContain('Authentication error: Auth0 service error');
    });
  });
});
