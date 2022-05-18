import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Passport } from '../../modules/auth/domain/passport.model';

const extractPassportStrategy = Object.freeze({
  http: (ctx: ExecutionContext): Passport => ctx.switchToHttp().getRequest().passport,
});

export const AuthContext = createParamDecorator((data: unknown, ctx: ExecutionContext): Passport => {
  const ctxType = ctx.getType();
  const passport: Passport = extractPassportStrategy[ctxType](ctx);
  return passport;
});
