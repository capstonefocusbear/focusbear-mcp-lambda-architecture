import { CanActivate, createParamDecorator, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OpenclawTokenRepository } from '../repositories/openclaw-token.repository';

export const OPENCLAW_SCOPE_KEY = 'openclaw_scope';

/**
 * Decorator to extract the OpenClaw user ID from the request.
 * Use in controllers protected by OpenclawTokenGuard.
 */
export const OpenclawUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return request.openclawUserId;
});

/**
 * Decorator to extract the OpenClaw scopes from the request.
 * Use in controllers protected by OpenclawTokenGuard.
 */
export const OpenclawScopes = createParamDecorator((_data: unknown, ctx: ExecutionContext): string[] => {
  const request = ctx.switchToHttp().getRequest();
  return request.openclawScopes;
});

@Injectable()
export class OpenclawTokenGuard implements CanActivate {
  constructor(
    private readonly openclawTokenRepository: OpenclawTokenRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header. Expected: Bearer <token>');
    }

    const rawToken = authHeader.split(' ')[1];

    if (!rawToken) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = await this.openclawTokenRepository.findByRawToken(rawToken);

    if (!token) {
      throw new UnauthorizedException('Invalid or revoked token');
    }

    if (token.expires_at && token.expires_at < new Date()) {
      throw new UnauthorizedException('Token has expired');
    }

    // Check required scope if specified via metadata (future: @RequireScope decorator)
    const requiredScope = this.reflector.get<string>(OPENCLAW_SCOPE_KEY, context.getHandler());
    if (requiredScope && !token.scopes.includes(requiredScope)) {
      throw new UnauthorizedException(`Token missing required scope: ${requiredScope}`);
    }

    // Attach context to request for use in controllers
    request.openclawUserId = token.user_id;
    request.openclawScopes = token.scopes;

    // Update last_used_at asynchronously — fire-and-forget, must not block the response
    this.openclawTokenRepository.updateLastUsed(token.id).catch(() => {
      // Non-critical update — silently ignore failures
    });

    return true;
  }
}
