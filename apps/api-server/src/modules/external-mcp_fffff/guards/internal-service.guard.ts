import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.headers?.authorization?.startsWith('Bearer ') && request.headers.authorization.slice(7).includes('.'))
      return true;
    // const incomingKey = request.headers['x-internal-service-key'];
    const incomingKey = request.headers['x-internal-service-key'] || request.headers['X-Internal-Service-Key'];

    // This must match the key you set in the mcp-server!
    const expectedKey = process.env.INTERNAL_SERVICE_KEY;

    if (!incomingKey || incomingKey !== expectedKey) {
      throw new UnauthorizedException('Access Denied: Invalid Internal Service Key');
    }

    return true;
  }
}
