import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException(
        'API key is required. Provide it via X-API-Key header or api_key query parameter.',
      );
    }

    const validatedKey = await this.apiKeyService.validateApiKey(apiKey);

    if (!validatedKey) {
      throw new UnauthorizedException('Invalid or expired API key.');
    }

    request.apiKeyUser = {
      id: validatedKey.user_id,
      apiKeyId: validatedKey.id,
    };

    return true;
  }

  private extractApiKey(request: any): string | null {
    const headerKey = request.headers['x-api-key'];
    if (headerKey) {
      return headerKey;
    }

    const queryKey = request.query?.api_key;
    if (queryKey) {
      return queryKey;
    }

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token.startsWith('fb_')) {
        return token;
      }
    }

    return null;
  }
}
