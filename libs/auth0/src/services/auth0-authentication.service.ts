import { Injectable, Inject } from '@nestjs/common';
import * as jwksClient from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import { AuthenticationClient } from 'auth0';
import { AUTH0_MODULE_OPTIONS } from '../auth0.constants';
import { IAuth0Options, IAuthenticationService } from '../interfaces';

@Injectable()
export class Auth0AuthenticationService extends AuthenticationClient implements IAuthenticationService {
  constructor(@Inject(AUTH0_MODULE_OPTIONS) private readonly Auth0Options: IAuth0Options) {
    super({ ...Auth0Options });
    this.jwksClient = jwksClient({
      jwksUri: `https://${this.Auth0Options.domain}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  private readonly jwksClient: jwksClient.JwksClient;

  async validateAccessToken(token: string): Promise<[boolean, { payload?: any; declineReason?: string }]> {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded) return [false, { declineReason: 'Token missing or corrupted!' }];
      const { header, payload } = decoded;
      const isAccessToken = (payload as jwt.JwtPayload)?.aud?.includes(this.Auth0Options.identifier);
      if (!isAccessToken) return [false, { declineReason: 'Token is not an access auth0 token type!' }];
      const signingKey = await this.jwksClient.getSigningKey(header?.kid);
      const publicKey = signingKey.getPublicKey();
      const validToken = await jwt.verify(token, publicKey);
      const isValid = Boolean(validToken);
      return [isValid, { payload }];
    } catch ({ message }) {
      return [false, { declineReason: message }];
    }
  }
}
