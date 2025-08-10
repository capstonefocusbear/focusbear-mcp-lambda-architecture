import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ServiceAccountPassport } from '../../domain/service-account-passport.model';

const contextStrategy = Object.freeze({
  http: (ctx: ExecutionContext) => ctx.switchToHttp().getRequest().raw,
});

@Injectable()
export class ServiceAccountAuth implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const ctxType = ctx.getType();
    const context = contextStrategy[ctxType](ctx);
    const { isAuth, declineReason }: ServiceAccountPassport = context.serviceAccountPassport;

    if (!isAuth) {
      throw new UnauthorizedException(declineReason);
    }

    return isAuth;
  }
}
