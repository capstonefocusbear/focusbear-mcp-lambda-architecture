import { Injectable, Inject, Logger } from '@nestjs/common';
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
    const { data: user } = await this.users.get({ id: auth0Id });
    return user;
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
