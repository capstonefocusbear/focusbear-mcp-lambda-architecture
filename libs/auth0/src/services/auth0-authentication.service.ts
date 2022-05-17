import { Injectable, Inject } from '@nestjs/common';
import { AuthenticationClient } from 'auth0';
import * as jwksClient from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import { AUTH0_MODULE_OPTIONS } from '../auth0.constants';
import { IAuth0Options, IAuthenticationService } from '../interfaces';

@Injectable()
export class Auth0AuthenticationService extends AuthenticationClient implements IAuthenticationService {
  constructor(@Inject(AUTH0_MODULE_OPTIONS) private Auth0Options: IAuth0Options) {
    super({ ...Auth0Options });
  }

  private readonly jwksClient: jwksClient.JwksClient = jwksClient({
    jwksUri: `https://${this.Auth0Options.domain}/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  async validateAccessToken(token: string): Promise<[boolean, any]> {
    try {
      const { header, payload }: any = jwt.decode(token, { complete: true });
      const kid = header?.kid;
      const { aud } = payload;
      const isAccessToken = Boolean(aud.includes(this.Auth0Options.identifier));
      if (!isAccessToken) return [false, null];
      const signingKey = await this.jwksClient.getSigningKey(kid);
      const publicKey = signingKey.getPublicKey();
      const validToken = await jwt.verify(token, publicKey);
      const isValid = Boolean(validToken);
      return [isValid, payload];
    } catch (e) {
      return [false, null];
    }
  }
}
