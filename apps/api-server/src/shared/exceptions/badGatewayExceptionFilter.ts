import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class BadGatewayExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BadGatewayExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{
      method?: string;
      url?: string;
      id?: string;
      headers?: Record<string, any>;
      log?: any;
    }>();
    const requestLogger = request?.log;

    const status = exception?.getStatus() || 500;
    const message =
      status === HttpStatus.BAD_GATEWAY ? `<html><body>${response.statusCode} error</body></html>` : exception.message;

    if (status === HttpStatus.BAD_GATEWAY || status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const payload = {
        event: 'BadGatewayException',
        status,
        requestId: request?.id || request?.headers?.['x-request-id'],
        method: request?.method,
        path: request?.url,
        message: exception?.message,
      };

      if (requestLogger?.error) {
        requestLogger.error(payload, 'Bad gateway or upstream failure');
      } else {
        this.logger.error(JSON.stringify(payload));
      }
    }

    response.status(status);
    response.send(message);
  }
}
