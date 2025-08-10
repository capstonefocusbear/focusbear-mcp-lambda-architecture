import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ServiceAccountPassport } from '../domain/service-account-passport.model';

const extractServiceAccountPassportStrategy = Object.freeze({
  http: (ctx: ExecutionContext): ServiceAccountPassport => ctx.switchToHttp().getRequest().raw.serviceAccountPassport,
});

export const ServiceAccountContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ServiceAccountPassport => {
    const ctxType = ctx.getType();
    const passport: ServiceAccountPassport = extractServiceAccountPassportStrategy[ctxType](ctx);
    return passport;
  },
);
