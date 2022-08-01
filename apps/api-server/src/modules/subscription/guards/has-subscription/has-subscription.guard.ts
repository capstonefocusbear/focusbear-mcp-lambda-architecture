import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Passport } from '../../../auth/domain/passport.model';

const contextStrategy = Object.freeze({
  http: (ctx: ExecutionContext) => ctx.switchToHttp().getRequest().raw,
});

@Injectable()
export class HasSubscription implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const ctxType = ctx.getType();
    const context = contextStrategy[ctxType](ctx);
    const { user }: Passport = context.passport;
    const isAllowed = user?.hasActiveSubscription;
    const exception = new HttpException(
      {
        statusCode: 402,
        message: 'The current user has no active subscription!',
        error: 'Active Subscription Required',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
    if (!user?.hasActiveSubscription) throw exception;
    return isAllowed;
  }
}
