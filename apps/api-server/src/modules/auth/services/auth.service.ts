import { Injectable } from '@nestjs/common';
import { Auth0AuthenticationService } from '../../../../../../libs/auth0/src';
import { Passport } from '../domain/passport.model';

@Injectable()
export class AuthService {
  constructor(private readonly auth0AuthService: Auth0AuthenticationService) {}

  async authenticate({ authorization }: { authorization: string }): Promise<Passport> {
    const token: string = this.extractBearerToken(authorization);
    const [isAuth, { payload, declineReason }] = await this.auth0AuthService.validateAccessToken(token);
    if (!isAuth) return new Passport({ declineReason });
    // const { userAuthMetadata } = this.extractCustomTokenClaim(payload);
    const passport = new Passport({ isAuth, user: payload });
    return passport;
  }

  private extractBearerToken(authHeader: string): string | undefined {
    if (!authHeader) return undefined;
    const [, token] = authHeader.split(' ');
    return token;
  }

  /**
   * Custom claims of Auth0 access token is URL format always.
   * By convention, [domain]/[keyName], keyName is always the last one after "/".
   * This method finds all custom token claims.
   * Converts URL-like keys into usual object keys and return them.
   */
  private extractCustomTokenClaim(payload: string): any {
    const payloadEntries = Object.entries(payload);
    const isCustomClaim = ([key, ,]) => key.startsWith('http://') || key.startsWith('https://');
    const customClaims = payloadEntries.filter(isCustomClaim);
    const parseCustomClaim = ([key, value]) => [key.split('/').pop(), value];
    const parsedCustomClaimsEntries = customClaims.map(parseCustomClaim);
    const parsedCustomClaims = Object.fromEntries(parsedCustomClaimsEntries);
    return parsedCustomClaims;
  }
}
