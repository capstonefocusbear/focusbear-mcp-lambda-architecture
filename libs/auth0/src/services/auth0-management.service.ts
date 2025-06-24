import { Injectable, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { DeviceCredential, ManagementClient } from 'auth0';
import { AUTH0_MODULE_OPTIONS } from '../auth0.constants';
import { IAuth0Options, IManagementService } from '../interfaces';

@Injectable()
export class Auth0ManagementService extends ManagementClient implements IManagementService {
  private readonly logger: Logger;

  constructor(@Inject(AUTH0_MODULE_OPTIONS) private readonly options: IAuth0Options) {
    super({ domain: options.domain, clientId: options.clientId, clientSecret: options.clientSecret });
    this.logger = new Logger('Auth0ManagementService');
  }

  async getAuth0User(auth0Id: string) {
    try {
      const { data: user } = await this.users.get({ id: auth0Id });
      return user;
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

  async getAuth0UsersWithEmail(email: string) {
    const { data: usersMatchingEmail } = await this.users.getAll({ q: `email:"${email}"` });
    return usersMatchingEmail;
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

  async markUserEmailAsVerified(auth0Id: string) {
    try {
      return await this.users.update({ id: auth0Id }, { email_verified: true });
    } catch (error) {
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
    } catch (error) {
      throw new HttpException('Failed to update password in Auth0', HttpStatus.BAD_REQUEST);
    }
  }
}
