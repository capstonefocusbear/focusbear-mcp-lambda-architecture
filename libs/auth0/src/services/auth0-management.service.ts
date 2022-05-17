import { Injectable, Inject, Logger } from '@nestjs/common';
import { ManagementClient } from 'auth0';
import { AUTH0_MODULE_OPTIONS } from '../auth0.constants';
import { IAuth0Options, IManagementService } from '../interfaces';

@Injectable()
export class Auth0ManagementService extends ManagementClient implements IManagementService {
  private readonly logger: Logger;

  constructor(@Inject(AUTH0_MODULE_OPTIONS) private Auth0Options: IAuth0Options) {
    super({
      clientId: Auth0Options.nonInteractiveClientId,
      clientSecret: Auth0Options.nonInteractiveClientSecret,
      domain: Auth0Options.domain,
    });
    this.logger = new Logger('Auth0ManagementService');
  }
}
