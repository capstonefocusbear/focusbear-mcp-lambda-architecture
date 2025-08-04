import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { Auth0AuthenticationService } from './auth0-authentication.service';
import { AUTH0_MODULE_OPTIONS } from '../auth0.constants';
import { IAuth0Options } from '../interfaces';

// Mock auth0 library
jest.mock('auth0');

// Mock jwks-rsa library
const mockJwksClient = {
  getSigningKey: jest.fn(),
};
jest.mock('jwks-rsa', () => {
  return jest.fn(() => mockJwksClient);
});

// Mock jsonwebtoken library
jest.mock('jsonwebtoken', () => ({
  decode: jest.fn(),
  verify: jest.fn(),
}));

describe('Auth0AuthenticationService', () => {
  let service: Auth0AuthenticationService;

  const mockAuth0Options: IAuth0Options = {
    domain: 'test.auth0.com',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    identifier: 'test-identifier',
    connection: 'Username-Password-Authentication',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Auth0AuthenticationService,
        {
          provide: AUTH0_MODULE_OPTIONS,
          useValue: mockAuth0Options,
        },
      ],
    }).compile();

    service = module.get<Auth0AuthenticationService>(Auth0AuthenticationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAccessToken', () => {
    const mockToken = 'mock.jwt.token';
    const mockDecodedToken = {
      header: { kid: 'test-kid' },
      payload: {
        aud: ['test-identifier', 'other-audience'],
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      },
    };
    const mockSigningKey = {
      getPublicKey: jest.fn().mockReturnValue('mock-public-key'),
    };

    it('positive: should validate a valid access token', async () => {
      (jwt.decode as jest.Mock).mockReturnValue(mockDecodedToken);
      mockJwksClient.getSigningKey.mockResolvedValue(mockSigningKey);
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken.payload);

      const result = await service.validateAccessToken(mockToken);

      expect(result).toEqual([true, { payload: mockDecodedToken.payload }]);
      expect(jwt.decode).toHaveBeenCalledWith(mockToken, { complete: true });
      expect(mockJwksClient.getSigningKey).toHaveBeenCalledWith('test-kid');
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'mock-public-key');
    });

    it('negative: should return false when token is missing or corrupted', async () => {
      (jwt.decode as jest.Mock).mockReturnValue(null);

      const result = await service.validateAccessToken(mockToken);

      expect(result).toEqual([false, { declineReason: 'Token missing or corrupted!' }]);
      expect(jwt.decode).toHaveBeenCalledWith(mockToken, { complete: true });
      expect(mockJwksClient.getSigningKey).not.toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('negative: should return false when token is not an access token type', async () => {
      const idTokenDecoded = {
        ...mockDecodedToken,
        payload: {
          ...mockDecodedToken.payload,
          aud: ['different-audience'],
        },
      };
      (jwt.decode as jest.Mock).mockReturnValue(idTokenDecoded);

      const result = await service.validateAccessToken(mockToken);

      expect(result).toEqual([false, { declineReason: 'Token is not an access auth0 token type!' }]);
      expect(jwt.decode).toHaveBeenCalledWith(mockToken, { complete: true });
      expect(mockJwksClient.getSigningKey).not.toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('negative: should return false when token has invalid signature', async () => {
      (jwt.decode as jest.Mock).mockReturnValue(mockDecodedToken);
      mockJwksClient.getSigningKey.mockResolvedValue(mockSigningKey);
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid signature');
      });

      const result = await service.validateAccessToken(mockToken);

      expect(result).toEqual([false, { declineReason: 'invalid signature' }]);
      expect(jwt.decode).toHaveBeenCalledWith(mockToken, { complete: true });
      expect(mockJwksClient.getSigningKey).toHaveBeenCalledWith('test-kid');
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'mock-public-key');
    });

    it('negative: should return false when token is expired', async () => {
      const expiredTokenDecoded = {
        ...mockDecodedToken,
        payload: {
          ...mockDecodedToken.payload,
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
      };
      (jwt.decode as jest.Mock).mockReturnValue(expiredTokenDecoded);
      mockJwksClient.getSigningKey.mockResolvedValue(mockSigningKey);
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const result = await service.validateAccessToken(mockToken);

      expect(result).toEqual([false, { declineReason: 'jwt expired' }]);
      expect(jwt.decode).toHaveBeenCalledWith(mockToken, { complete: true });
      expect(mockJwksClient.getSigningKey).toHaveBeenCalledWith('test-kid');
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'mock-public-key');
    });

    it('negative: should return false when unable to fetch signing key', async () => {
      (jwt.decode as jest.Mock).mockReturnValue(mockDecodedToken);
      mockJwksClient.getSigningKey.mockRejectedValue(new Error('Network error'));

      const result = await service.validateAccessToken(mockToken);

      expect(result).toEqual([false, { declineReason: 'Network error' }]);
      expect(jwt.decode).toHaveBeenCalledWith(mockToken, { complete: true });
      expect(mockJwksClient.getSigningKey).toHaveBeenCalledWith('test-kid');
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('negative: should return false when token has missing kid in header', async () => {
      const tokenWithoutKid = {
        header: {},
        payload: mockDecodedToken.payload,
      };
      (jwt.decode as jest.Mock).mockReturnValue(tokenWithoutKid);
      mockJwksClient.getSigningKey.mockRejectedValue(new Error('Unable to find a signing key'));

      const result = await service.validateAccessToken(mockToken);

      expect(result).toEqual([false, { declineReason: 'Unable to find a signing key' }]);
      expect(jwt.decode).toHaveBeenCalledWith(mockToken, { complete: true });
      expect(mockJwksClient.getSigningKey).toHaveBeenCalledWith(undefined);
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('negative: should handle payload with string audience', async () => {
      const tokenWithStringAud = {
        ...mockDecodedToken,
        payload: {
          ...mockDecodedToken.payload,
          aud: 'test-identifier', // String instead of array
        },
      };
      (jwt.decode as jest.Mock).mockReturnValue(tokenWithStringAud);
      mockJwksClient.getSigningKey.mockResolvedValue(mockSigningKey);
      (jwt.verify as jest.Mock).mockReturnValue(tokenWithStringAud.payload);

      const result = await service.validateAccessToken(mockToken);

      expect(result).toEqual([true, { payload: tokenWithStringAud.payload }]);
    });

    it('negative: should return false when audience is undefined', async () => {
      const tokenWithoutAud = {
        ...mockDecodedToken,
        payload: {
          exp: mockDecodedToken.payload.exp,
          iat: mockDecodedToken.payload.iat,
        },
      };
      (jwt.decode as jest.Mock).mockReturnValue(tokenWithoutAud);

      const result = await service.validateAccessToken(mockToken);

      expect(result).toEqual([false, { declineReason: 'Token is not an access auth0 token type!' }]);
    });
  });
});
