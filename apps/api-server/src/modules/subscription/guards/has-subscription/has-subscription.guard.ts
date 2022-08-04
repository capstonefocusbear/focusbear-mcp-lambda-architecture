import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Passport } from '../../../auth/domain/passport.model';
import { UserAuthContext } from '../../../auth/domain/user-auth-context.model';
import { Entitlement } from '../../domain/entitlement.enum';

const contextStrategy = Object.freeze({
  http: (ctx: ExecutionContext) => ctx.switchToHttp().getRequest().raw,
});

@Injectable()
export class HasSubscription implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const ctxType = ctx.getType();
    const context = contextStrategy[ctxType](ctx);
    const { user }: Passport = context.passport;
    const meta = this.reflector.get<Entitlement[]>('RequireEntitlements', ctx.getHandler());
    return meta ? this.hasEntitlements(user, meta) : this.hasSubscription(user);
  }

  private hasSubscription(user: UserAuthContext): boolean {
    const isAllowed = user?.subscriptionStatus.hasActiveSubscription;
    const exception = new HttpException(
      {
        statusCode: 402,
        message: 'The current user has no active subscription!',
        error: 'Active Subscription Required',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
    if (!isAllowed) throw exception;
    return isAllowed;
  }

  private hasEntitlements(user: UserAuthContext, acceptedEntitlements: Entitlement[]): boolean {
    const { activeEntitlements } = user.subscriptionStatus;
    const isAllowed = acceptedEntitlements.every((e) => activeEntitlements.includes(e));
    const exception = new HttpException(
      {
        statusCode: 402,
        message: `The user has no entitlements to get access! Required ones: ${acceptedEntitlements.join(', ')}!`,
        error: 'Active Subscription Required',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
    if (!isAllowed) throw exception;
    return isAllowed;
  }
}

export const RequireEntitlements = (entitlements: Entitlement[]) => SetMetadata('RequireEntitlements', entitlements);
