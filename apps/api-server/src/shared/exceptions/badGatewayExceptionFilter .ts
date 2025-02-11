import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class BadGatewayExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception?.getStatus() || 500;
    const message =
      status === HttpStatus.BAD_GATEWAY ? `<html><body>${response.statusCode} error</body></html>` : exception.message;

    response.status(status);
    response.send(message);
  }
}
