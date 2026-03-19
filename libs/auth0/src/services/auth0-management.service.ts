import { Injectable, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { DeviceCredential, ManagementClient } from 'auth0';
import Redis from 'ioredis';
import { AUTH0_MODULE_OPTIONS } from '../auth0.constants';
import { IAuth0Options, IManagementService, Auth0User } from '../interfaces';
import { FieldTransformer, callPromiseWithTimeout } from '../../../../apps/api-server/src/shared/utils/helpers';

const AUTH0_USER_CACHE_TTL_SECONDS = 3600;
const AUTH0_USERS_BY_EMAIL_CACHE_TTL_SECONDS = 1800;

const getAuth0UserCacheKey = (auth0Id: string) => `auth0:user:${auth0Id}`;
const getAuth0UsersByEmailCacheKey = (email: string) => `auth0:users:email:${email}`;

@Injectable()
export class Auth0ManagementService extends ManagementClient implements IManagementService {
  private readonly logger: Logger;

  private redisClient: Redis;

  constructor(@Inject(AUTH0_MODULE_OPTIONS) private readonly options: IAuth0Options) {
    super({ domain: options.domain, clientId: options.clientId, clientSecret: options.clientSecret });
    this.logger = new Logger('Auth0ManagementService');
    this.validateRedisEnvironment();
    this.redisClient = new Redis(`redis://${process.env.REDIS_HOSTNAME}:${process.env.REDIS_PORT}`);
  }

  private validateRedisEnvironment(): void {
    if (!process.env.REDIS_HOSTNAME) {
      throw new Error('REDIS_HOSTNAME environment variable is required but not set');
    }
    if (!process.env.REDIS_PORT) {
      throw new Error('REDIS_PORT environment variable is required but not set');
    }
  }

  private async getCachedUser(auth0Id: string): Promise<any> {
    try {
      const cacheKey = getAuth0UserCacheKey(auth0Id);
      const encryptedData = await this.redisClient.get(cacheKey);
      if (!encryptedData) return null;

      // Decrypt the cached data
      const decryptedData = FieldTransformer.from(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Failed to get cached user:', error);
      return null;
    }
  }

  private async setCachedUser(auth0Id: string, userData: any): Promise<void> {
    try {
      const cacheKey = getAuth0UserCacheKey(auth0Id);
      // Encrypt the user data before storing in Redis
      const jsonData = JSON.stringify(userData);
      const encryptedData = FieldTransformer.to(jsonData);
      await this.redisClient.setex(cacheKey, AUTH0_USER_CACHE_TTL_SECONDS, encryptedData);
    } catch (error) {
      console.error('Failed to cache user:', error);
    }
  }

  async getAuth0User(auth0Id: string): Promise<Auth0User | null> {
    try {
      // Try to get cached user first (timeboxed)
      const cachedUser = await callPromiseWithTimeout(this.getCachedUser(auth0Id), 300).catch(() => null);
      if (cachedUser) {
        return cachedUser;
      }

      // Fetch from Auth0 if not cached
      const { data: user } = await callPromiseWithTimeout(this.users.get({ id: auth0Id }), 4000);

      // Cache the user data for future requests
      if (user) {
        await this.setCachedUser(auth0Id, user);
      }
      return user as Auth0User;
    } catch (error) {
      if (error.message.includes('does not exist')) {
        return null;
      }

      throw new Error(`Error fetching user with Auth0 ID ${auth0Id}: ${error}`);
    }
  }

  async resendEmailVerification(auth0Id: string) {
    return this.jobs.verifyEmail({ user_id: auth0Id });
  }

  async getAuth0UsersWithEmail(email: string): Promise<any[]> {
    try {
      // Try to get cached users first
      const cacheKey = getAuth0UsersByEmailCacheKey(email);
      const encryptedData = await this.redisClient.get(cacheKey);
      if (encryptedData) {
        const decryptedData = FieldTransformer.from(encryptedData);
        return JSON.parse(decryptedData);
      }

      // Fetch from Auth0 if not cached
      const { data: usersMatchingEmail } = await this.users.getAll({ q: `email:"${email}"` });

      // Cache the results for future requests (shorter cache time for email searches)
      if (usersMatchingEmail) {
        const jsonData = JSON.stringify(usersMatchingEmail);
        const encryptedUserData = FieldTransformer.to(jsonData);
        await this.redisClient.setex(cacheKey, AUTH0_USERS_BY_EMAIL_CACHE_TTL_SECONDS, encryptedUserData);
      }
      return usersMatchingEmail;
    } catch (error) {
      console.error('Failed to get users with email:', error);
      // Fallback to direct API call if Redis fails
      const { data: usersMatchingEmail } = await this.users.getAll({ q: `email:"${email}"` });
      return usersMatchingEmail;
    }
  }

  async deleteAuth0User(auth0Id: string) {
    await this.users.delete({ id: auth0Id });
  }

  async getDeviceCredentials(auth0Id: string): Promise<DeviceCredential[]> {
    try {
      const response = await this.deviceCredentials.getAll({ user_id: auth0Id });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch device credentials: ', error);
      return [];
    }
  }

  async markUserEmailAsVerified(auth0Id: string, email?: string) {
    try {
      const result = await this.users.update({ id: auth0Id }, { email_verified: true });

      try {
        const cacheKeysToDelete = [getAuth0UserCacheKey(auth0Id)];
        if (email) {
          cacheKeysToDelete.push(getAuth0UsersByEmailCacheKey(email));
        }
        await this.redisClient.del(...cacheKeysToDelete);
      } catch (cacheError) {
        this.logger.warn(`Failed to invalidate Auth0 user cache for ${auth0Id}: ${cacheError?.message ?? cacheError}`);
      }

      return result;
    } catch {
      throw new HttpException('Failed to verify email in Auth0', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updatePassword(auth0Id: string, newPassword: string) {
    try {
      return await this.users.update(
        { id: auth0Id },
        {
          password: newPassword,
          connection: 'Username-Password-Authentication',
        },
      );
    } catch {
      throw new HttpException('Failed to update password in Auth0', HttpStatus.BAD_REQUEST);
    }
  }
}
