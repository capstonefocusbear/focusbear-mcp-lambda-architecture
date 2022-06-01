import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const contextStrategy = Object.freeze({
  http: (ctx: ExecutionContext) => ctx.switchToHttp().getRequest().raw,
});

@Injectable()
export class HasAuth0ActionSecret implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const ctxType = ctx.getType();
    const context = contextStrategy[ctxType](ctx);
    const key = context?.headers?.auth0_action_secret;
    const secret = this.configService.get<string>('auth0.actionSecret');
    const hasValidKey = key === secret;
    if (!hasValidKey) throw new UnauthorizedException('Invalid Auth0 action secret!');
    return hasValidKey;
  }
}
