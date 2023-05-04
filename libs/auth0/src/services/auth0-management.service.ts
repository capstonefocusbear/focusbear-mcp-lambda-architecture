import { Injectable, Inject, Logger } from '@nestjs/common';
import { ManagementClient } from 'auth0';
import { AUTH0_MODULE_OPTIONS } from '../auth0.constants';
import { IAuth0Options, IManagementService } from '../interfaces';

@Injectable()
export class Auth0ManagementService extends ManagementClient implements IManagementService {
  private readonly logger: Logger;

  constructor(@Inject(AUTH0_MODULE_OPTIONS) private readonly options: IAuth0Options) {
    super({ domain: options.domain, ...options.management });
    this.logger = new Logger('Auth0ManagementService');
  }

  async getAuth0User(auth0Id: string) {
    return this.getUser({ id: auth0Id });
  }

  async deleteAuth0User(auth0Id: string) {
    await this.deleteUser({ id: auth0Id });
  }
}
