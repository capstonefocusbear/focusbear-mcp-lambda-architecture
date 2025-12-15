import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { SentryService } from '@app/observability';
import { Auth0ManagementService } from './auth0-management.service';
import { AUTH0_MODULE_OPTIONS } from '../auth0.constants';
import { IAuth0Options } from '../interfaces';

// Mock auth0 library
jest.mock('auth0', () => {
  const mockUsers = {
    get: jest.fn(),
    getAll: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  const mockJobs = {
    verifyEmail: jest.fn(),
  };

  const mockDeviceCredentials = {
    getAll: jest.fn(),
  };

  return {
    ManagementClient: jest.fn().mockImplementation(function () {
      this.users = mockUsers;
      this.jobs = mockJobs;
      this.deviceCredentials = mockDeviceCredentials;
    }),
  };
});

// Mock Redis
jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
  }));
  return { default: mockRedis };
});

// Mock FieldTransformer and callPromiseWithTimeout
jest.mock('../../../../apps/api-server/src/shared/utils/helpers', () => ({
  FieldTransformer: {
    to: jest.fn((data) => `encrypted_${data}`),
    from: jest.fn((data) => data.replace('encrypted_', '')),
  },
  callPromiseWithTimeout: jest.fn((promise: Promise<any>) => promise),
}));

describe('Auth0ManagementService', () => {
  let service: Auth0ManagementService;

  const mockAuth0Options: IAuth0Options = {
    domain: 'test.auth0.com',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    identifier: 'test-identifier',
    connection: 'Username-Password-Authentication',
  };

  const mockUser = {
    user_id: 'auth0|123456',
    email: 'test@example.com',
    email_verified: false,
    name: 'Test User',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Redis environment variables
    process.env.REDIS_HOSTNAME = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.FIELD_TRANSFORMER_ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Auth0ManagementService,
        {
          provide: AUTH0_MODULE_OPTIONS,
          useValue: mockAuth0Options,
        },
        {
          provide: SentryService,
          useValue: {
            instance: () => ({
              captureException: jest.fn(),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<Auth0ManagementService>(Auth0ManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAuth0User', () => {
    const auth0Id = 'auth0|123456';

    it('positive: should return user when found', async () => {
      const getUserSpy = jest.spyOn(service.users, 'get').mockResolvedValue({ data: mockUser } as any);

      const result = await service.getAuth0User(auth0Id);

      expect(result).toEqual(mockUser);
      expect(getUserSpy).toHaveBeenCalledWith({ id: auth0Id });
    });

    it('negative: should return null when user does not exist', async () => {
      const getUserSpy = jest.spyOn(service.users, 'get').mockRejectedValue(new Error('The user does not exist.'));

      const result = await service.getAuth0User(auth0Id);

      expect(result).toBeNull();
      expect(getUserSpy).toHaveBeenCalledWith({ id: auth0Id });
    });

    it('negative: should throw error for other API errors', async () => {
      const errorMessage = 'Network error';
      jest.spyOn(service.users, 'get').mockRejectedValue(new Error(errorMessage));

      await expect(service.getAuth0User(auth0Id)).rejects.toThrow(
        `Error fetching user with Auth0 ID ${auth0Id}: Error: ${errorMessage}`,
      );
    });
  });

  describe('resendEmailVerification', () => {
    const auth0Id = 'auth0|123456';

    it('positive: should successfully trigger email verification', async () => {
      const mockJobResponse = { id: 'job_123', status: 'pending' };
      const verifyEmailSpy = jest.spyOn(service.jobs, 'verifyEmail').mockResolvedValue(mockJobResponse as any);

      const result = await service.resendEmailVerification(auth0Id);

      expect(result).toEqual(mockJobResponse);
      expect(verifyEmailSpy).toHaveBeenCalledWith({ user_id: auth0Id });
    });

    it('negative: should throw error on API failure', async () => {
      const errorMessage = 'Failed to create job';
      jest.spyOn(service.jobs, 'verifyEmail').mockRejectedValue(new Error(errorMessage));

      await expect(service.resendEmailVerification(auth0Id)).rejects.toThrow(errorMessage);
    });
  });

  describe('getAuth0UsersWithEmail', () => {
    const email = 'test@example.com';

    it('positive: should return users matching email', async () => {
      const mockUsers = [mockUser, { ...mockUser, user_id: 'auth0|789012' }];
      const getAllSpy = jest.spyOn(service.users, 'getAll').mockResolvedValue({ data: mockUsers } as any);

      const result = await service.getAuth0UsersWithEmail(email);

      expect(result).toEqual(mockUsers);
      expect(getAllSpy).toHaveBeenCalledWith({ q: `email:"${email}"` });
    });

    it('positive: should return empty array when no users found', async () => {
      const getAllSpy = jest.spyOn(service.users, 'getAll').mockResolvedValue({ data: [] } as any);

      const result = await service.getAuth0UsersWithEmail(email);

      expect(result).toEqual([]);
      expect(getAllSpy).toHaveBeenCalledWith({ q: `email:"${email}"` });
    });

    it('negative: should throw error on API failure', async () => {
      const errorMessage = 'Search failed';
      jest.spyOn(service.users, 'getAll').mockRejectedValue(new Error(errorMessage));

      await expect(service.getAuth0UsersWithEmail(email)).rejects.toThrow(errorMessage);
    });
  });

  describe('deleteAuth0User', () => {
    const auth0Id = 'auth0|123456';

    it('positive: should successfully delete user', async () => {
      const deleteSpy = jest.spyOn(service.users, 'delete').mockResolvedValue({} as any);

      await service.deleteAuth0User(auth0Id);

      expect(deleteSpy).toHaveBeenCalledWith({ id: auth0Id });
    });

    it('negative: should throw error on deletion failure', async () => {
      const errorMessage = 'Deletion failed';
      jest.spyOn(service.users, 'delete').mockRejectedValue(new Error(errorMessage));

      await expect(service.deleteAuth0User(auth0Id)).rejects.toThrow(errorMessage);
    });
  });

  describe('getDeviceCredentials', () => {
    const auth0Id = 'auth0|123456';
    const mockDeviceCredentials = [
      { id: 'dev_123', device_name: 'iPhone', client_id: 'client_123' },
      { id: 'dev_456', device_name: 'Android', client_id: 'client_456' },
    ];

    it('positive: should return device credentials', async () => {
      const getAllSpy = jest
        .spyOn(service.deviceCredentials, 'getAll')
        .mockResolvedValue({ data: mockDeviceCredentials } as any);

      const result = await service.getDeviceCredentials(auth0Id);

      expect(result).toEqual(mockDeviceCredentials);
      expect(getAllSpy).toHaveBeenCalledWith({ user_id: auth0Id });
    });

    it('negative: should return empty array on API failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(service.deviceCredentials, 'getAll').mockRejectedValue(new Error('API Error'));

      const result = await service.getDeviceCredentials(auth0Id);

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch device credentials: ', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('markUserEmailAsVerified', () => {
    const auth0Id = 'auth0|123456';

    it('positive: should successfully mark email as verified', async () => {
      const updatedUser = { ...mockUser, email_verified: true };
      const updateSpy = jest.spyOn(service.users, 'update').mockResolvedValue({ data: updatedUser } as any);

      const result = await service.markUserEmailAsVerified(auth0Id);

      expect(result).toEqual({ data: updatedUser });
      expect(updateSpy).toHaveBeenCalledWith({ id: auth0Id }, { email_verified: true });
    });

    it('negative: should throw HttpException on failure', async () => {
      jest.spyOn(service.users, 'update').mockRejectedValue(new Error('Update failed'));

      await expect(service.markUserEmailAsVerified(auth0Id)).rejects.toThrow(
        new HttpException('Failed to verify email in Auth0', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('updatePassword', () => {
    const auth0Id = 'auth0|123456';
    const newPassword = 'NewSecurePassword123!';

    it('positive: should successfully update password', async () => {
      const updatedUser = { ...mockUser };
      const updateSpy = jest.spyOn(service.users, 'update').mockResolvedValue({ data: updatedUser } as any);

      const result = await service.updatePassword(auth0Id, newPassword);

      expect(result).toEqual({ data: updatedUser });
      expect(updateSpy).toHaveBeenCalledWith(
        { id: auth0Id },
        {
          password: newPassword,
          connection: 'Username-Password-Authentication',
        },
      );
    });

    it('negative: should throw HttpException on failure', async () => {
      jest.spyOn(service.users, 'update').mockRejectedValue(new Error('Password update failed'));

      await expect(service.updatePassword(auth0Id, newPassword)).rejects.toThrow(
        new HttpException('Failed to update password in Auth0', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('Redis Caching with Encryption', () => {
    const auth0Id = 'auth0|123456';
    let mockRedisClient: any;

    beforeEach(() => {
      // Get the mocked Redis client instance
      mockRedisClient = (service as any).redisClient;
    });

    it('should encrypt data before storing in Redis', async () => {
      const getUserSpy = jest.spyOn(service.users, 'get').mockResolvedValue({ data: mockUser } as any);
      const setexSpy = jest.spyOn(mockRedisClient, 'setex').mockResolvedValue('OK');

      await service.getAuth0User(auth0Id);

      expect(getUserSpy).toHaveBeenCalledWith({ id: auth0Id });
      expect(setexSpy).toHaveBeenCalledWith(`auth0:user:${auth0Id}`, 3600, expect.stringMatching(/^encrypted_/));
    });

    it('should decrypt data when retrieving from Redis', async () => {
      const getSpy = jest.spyOn(mockRedisClient, 'get').mockResolvedValue(`encrypted_${JSON.stringify(mockUser)}`);

      const result = await service.getAuth0User(auth0Id);

      expect(result).toEqual(mockUser);
      expect(getSpy).toHaveBeenCalledWith(`auth0:user:${auth0Id}`);
    });

    it('should handle Redis cache miss gracefully', async () => {
      const getSpy = jest.spyOn(mockRedisClient, 'get').mockResolvedValue(null);
      const getUserSpy = jest.spyOn(service.users, 'get').mockResolvedValue({ data: mockUser } as any);
      const setexSpy = jest.spyOn(mockRedisClient, 'setex').mockResolvedValue('OK');

      const result = await service.getAuth0User(auth0Id);

      expect(result).toEqual(mockUser);
      expect(getSpy).toHaveBeenCalledWith(`auth0:user:${auth0Id}`);
      expect(getUserSpy).toHaveBeenCalledWith({ id: auth0Id });
      expect(setexSpy).toHaveBeenCalled();
    });
  });
});
