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

  // Service account audience for team management
  private readonly SERVICE_ACCOUNT_AUDIENCE = 'https://focusbear.io/team-management';

  async validateAccessToken(token: string): Promise<[boolean, { payload?: any; declineReason?: string }]> {
    return this.validateToken(token, [this.Auth0Options.identifier]);
  }

  async validateServiceAccountToken(token: string): Promise<[boolean, { payload?: any; declineReason?: string }]> {
    return this.validateToken(token, [this.SERVICE_ACCOUNT_AUDIENCE]);
  }

  async validateToken(
    token: string,
    allowedAudiences: string[],
  ): Promise<[boolean, { payload?: any; declineReason?: string }]> {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded) return [false, { declineReason: 'Token missing or corrupted!' }];

      const { header, payload } = decoded;

      // Check if token has any of the allowed audiences
      const tokenAudience = (payload as jwt.JwtPayload)?.aud;
      const hasValidAudience = this.hasValidAudience(tokenAudience, allowedAudiences);

      if (!hasValidAudience) {
        return [
          false,
          { declineReason: `Token audience not allowed. Expected one of: ${allowedAudiences.join(', ')}` },
        ];
      }

      const signingKey = await this.jwksClient.getSigningKey(header?.kid);
      const publicKey = signingKey.getPublicKey();
      const validToken = await jwt.verify(token, publicKey);
      const isValid = Boolean(validToken);

      return [isValid, { payload }];
    } catch ({ message }) {
      return [false, { declineReason: message }];
    }
  }

  private hasValidAudience(tokenAudience: string | string[] | undefined, allowedAudiences: string[]): boolean {
    if (!tokenAudience) return false;

    // Handle both string and array audience formats
    if (Array.isArray(tokenAudience)) {
      return tokenAudience.some((aud) => allowedAudiences.includes(aud));
    }

    return allowedAudiences.includes(tokenAudience);
  }
}
