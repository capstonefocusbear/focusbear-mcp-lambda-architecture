import { Injectable } from '@nestjs/common';
import { Auth0AuthenticationService } from '@app/auth0';
import { ServiceAccountPassport } from '../domain/service-account-passport.model';
import { ServiceAccountAuthContext } from '../domain/service-account-auth-context.model';

@Injectable()
export class ServiceAccountAuthService {
  constructor(private readonly auth0AuthService: Auth0AuthenticationService) {}

  async authenticate({ authorization }: { authorization: string }): Promise<ServiceAccountPassport> {
    try {
      const token: string = this.extractBearerToken(authorization);
      const [isAuth, { payload, declineReason }] = await this.auth0AuthService.validateServiceAccountToken(token);

      if (!isAuth) {
        return new ServiceAccountPassport({ declineReason });
      }

      // Check if this is a machine-to-machine token
      if (payload.gty !== 'client-credentials') {
        return new ServiceAccountPassport({
          declineReason: 'Token is not a machine-to-machine token',
        });
      }

      // Validate the audience
      if (payload.aud !== 'https://focusbear.io/team-management') {
        return new ServiceAccountPassport({
          declineReason: 'Invalid audience for team management',
        });
      }

      // Parse the scope to extract action and team ID
      const serviceAccount = this.parseScope(payload.scope, payload);

      if (!serviceAccount) {
        return new ServiceAccountPassport({
          declineReason: 'Invalid scope format',
        });
      }

      const passport = new ServiceAccountPassport({ isAuth, serviceAccount });
      return passport;
    } catch (error) {
      return new ServiceAccountPassport({
        declineReason: `Authentication error: ${error.message}`,
      });
    }
  }

  private extractBearerToken(authHeader: string): string {
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }
    const [, token] = authHeader.split(' ');
    if (!token) {
      throw new Error('Bearer token missing');
    }
    return token;
  }

  private parseScope(scope: string, payload: any): ServiceAccountAuthContext | null {
    try {
      // Expected format: "admin:b9f1bce9-c130-4141-80d6-3bde32a66542"
      const [action, teamId] = scope.split(':');

      if (!action || !teamId) {
        return null;
      }

      // Validate action
      const validActions = ['admin', 'read', 'write'];
      if (!validActions.includes(action)) {
        return null;
      }

      // Validate team ID format (UUID) or "*" (for all teams)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(teamId) && teamId !== '*') {
        return null;
      }

      return {
        sub: payload.sub,
        scope: payload.scope,
        teamId,
        action,
        aud: payload.aud,
      };
    } catch {
      return null;
    }
  }
}
