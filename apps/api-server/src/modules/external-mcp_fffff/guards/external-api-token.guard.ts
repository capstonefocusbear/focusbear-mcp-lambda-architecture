import { McpAuth0Service } from '../services/mcp-auth0.service';
import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExternalApiTokenRepository } from '../repositories/external-api-token.repository';

export const MCP_SCOPE_KEY = 'mcp_scope';

/**
 * Decorator to extract the MCP user ID from the request.
 * Use in controllers protected by ExternalApiTokenGuard.
 */
export const McpUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return request.mcpUserId;
});

/**
 * Decorator to extract the MCP scopes from the request.
 * Use in controllers protected by ExternalApiTokenGuard.
 */
export const McpScopes = createParamDecorator((_data: unknown, ctx: ExecutionContext): string[] => {
  const request = ctx.switchToHttp().getRequest();
  return request.mcpScopes;
});

/**
 * Decorator to extract the authenticated MCP token ID from the request.
 * Use in controllers protected by ExternalApiTokenGuard to identify which agent made the request.
 */
export const McpTokenId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return request.mcpTokenId;
});

@Injectable()
export class ExternalApiTokenGuard implements CanActivate {
  constructor(
    private readonly externalApiTokenRepository: ExternalApiTokenRepository,
    private readonly reflector: Reflector,
    @Optional() private readonly oauth?: McpAuth0Service,
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

    // A dotted bearer token is always JWT mode, including malformed JWTs. Never retry as opaque.
    if (rawToken.includes('.')) {
      if (!this.oauth) throw new UnauthorizedException('Auth0 MCP is disabled');
      await this.oauth.authenticate(request, rawToken);
      const requiredScope = this.reflector.get<string>(MCP_SCOPE_KEY, context.getHandler());
      if (requiredScope && !request.mcpScopes.includes(requiredScope)) {
        throw new UnauthorizedException(`Token missing required scope: ${requiredScope}`);
      }
      return true;
    }

    const token = await this.externalApiTokenRepository.findByRawToken(rawToken);

    if (!token) {
      throw new UnauthorizedException('Invalid or revoked token');
    }

    if (token.expires_at && token.expires_at < new Date()) {
      throw new UnauthorizedException('Token has expired');
    }

    // Check required scope if specified via metadata (future: @RequireScope decorator)
    const requiredScope = this.reflector.get<string>(MCP_SCOPE_KEY, context.getHandler());
    if (requiredScope && !token.scopes.includes(requiredScope)) {
      throw new UnauthorizedException(`Token missing required scope: ${requiredScope}`);
    }

    // Attach context to request for use in controllers
    request.mcpUserId = token.user_id;
    request.mcpScopes = token.scopes;
    request.mcpTokenId = token.id;

    // Update last_used_at asynchronously — fire-and-forget, must not block the response
    this.externalApiTokenRepository.updateLastUsed(token.id).catch(() => {
      // Non-critical update — silently ignore failures
    });

    return true;
  }
}
