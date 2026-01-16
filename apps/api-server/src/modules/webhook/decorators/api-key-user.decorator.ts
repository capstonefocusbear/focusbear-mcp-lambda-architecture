import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ApiKeyUserContext {
  id: string;
  apiKeyId: string;
}

export const ApiKeyUser = createParamDecorator((data: unknown, ctx: ExecutionContext): ApiKeyUserContext => {
  const request = ctx.switchToHttp().getRequest();
  return request.apiKeyUser;
});
