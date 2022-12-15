import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { UserTypes } from '../../../user/domain/user-types.enum';

@Injectable()
export class IsAdmin implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const { headers } = request;
    const accessToken = headers?.authorization.split(' ')[1];
    const decodedToken = jwt.decode(accessToken);
    const roles: string[] = decodedToken['https://api.focusbear.io/roles'];
    const userIsAdmin = roles.includes(UserTypes.ADMIN);
    return userIsAdmin;
  }
}
