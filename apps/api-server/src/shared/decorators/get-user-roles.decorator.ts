import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export const GetUserRoles = createParamDecorator((_data, ctx: ExecutionContext): string[] => {
  const request = ctx.switchToHttp().getRequest();
  const { headers } = request;
  const accessToken = headers?.authorization.split(' ')[1];
  const decodedToken = jwt.decode(accessToken);
  const roles: string[] = decodedToken['https://api.focusbear.io/roles'];
  return roles;
});
