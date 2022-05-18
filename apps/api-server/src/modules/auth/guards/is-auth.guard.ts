import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Passport } from '../domain/passport.model';

const contextStrategy = Object.freeze({
  http: (ctx: ExecutionContext) => ctx.switchToHttp().getRequest().raw,
});

@Injectable()
export class IsAuth implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const ctxType = ctx.getType();
    const context = contextStrategy[ctxType](ctx);
    const { isAuth, declineReason }: Passport = context.passport;
    if (!isAuth) throw new UnauthorizedException(declineReason);
    return isAuth;
  }
}
