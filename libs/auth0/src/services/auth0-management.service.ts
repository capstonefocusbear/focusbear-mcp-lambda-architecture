import { Injectable, Inject, Logger, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { DeviceCredential, ManagementClient } from 'auth0';
import axios from 'axios';
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
    await this.jobs.verifyEmail({ user_id: auth0Id });
  }

  async initiatePasswordReset(email: string) {
    const users = await this.getAuth0UserWithEmail(email);
    if (users.length < 1) {
      throw new NotFoundException(`User with email: ${email} does not exist!`);
    }

    const user = users[0];
    if (!user.email_verified) {
      throw new HttpException(
        {
          error: 'EMAIL_NOT_VERIFIED',
          message: 'You need to verify your email before proceeding.',
          statusCode: HttpStatus.FORBIDDEN,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if the user is using a third-party provider
    const isThirdPartyUser = user.identities.some((identity) => identity.isSocial);
    if (isThirdPartyUser) {
      throw new HttpException(
        {
          error: 'THIRD_PARTY_EMAIL',
          message: 'Cannot reset password from a third-party email.',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const PASSWORD_RESET_URL = `https://${this.options.domain}/dbconnections/change_password`;
    await axios.post(PASSWORD_RESET_URL, {
      client_id: this.options.clientId,
      email,
      connection: 'Username-Password-Authentication',
    });
  }

  async getAuth0UserWithEmail(email: string) {
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
}
