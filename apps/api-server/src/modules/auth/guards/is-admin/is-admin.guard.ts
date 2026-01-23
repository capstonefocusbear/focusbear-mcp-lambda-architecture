import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { UserTypes } from '../../../user/domain/user-types.enum';
import { Passport } from '../../domain/passport.model';

/**
 * Guard that checks if the authenticated user has admin privileges.
 * IMPORTANT: This guard must be used together with IsAuth guard to ensure
 * the JWT has been properly verified before trusting its claims.
 */
@Injectable()
export class IsAdmin implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // Ensure user is authenticated first (IsAuth guard must run before this)
    // This prevents bypassing admin check with a forged JWT
    const passport: Passport = request.raw?.passport;
    if (!passport?.isAuth) {
      throw new UnauthorizedException('User must be authenticated before checking admin status');
    }

    const { headers } = request;
    const accessToken = headers?.authorization?.split(' ')[1];
    if (!accessToken) {
      throw new UnauthorizedException('No access token provided');
    }

    const decodedToken = jwt.decode(accessToken);
    if (!decodedToken) {
      throw new UnauthorizedException('Invalid access token');
    }

    const roles: string[] = decodedToken['https://api.focusbear.io/roles'] || [];
    const userIsAdmin = roles.includes(UserTypes.ADMIN);
    return userIsAdmin;
  }
}
