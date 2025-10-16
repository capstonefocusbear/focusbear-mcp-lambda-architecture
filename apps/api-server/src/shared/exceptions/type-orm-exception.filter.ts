import { ExceptionFilter, Catch, ArgumentsHost, Logger, ConflictException } from '@nestjs/common';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

const exceptionStrategy = {
  http: (message) => new ConflictException(message),
};

@Catch(QueryFailedError, EntityNotFoundError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TypeOrmExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctxType = host.getType();
    const { message, stack } = exception;
    const payload = {
      event: 'TypeOrmException',
      name: exception?.name,
      message,
      detail: exception?.detail,
      code: exception?.code,
      query: exception?.query,
    };

    if (ctxType === 'http') {
      const request = host
        .switchToHttp()
        .getRequest<{ method?: string; url?: string; id?: string; headers?: Record<string, any>; log?: any }>();
      const requestLogger = request?.log;
      if (requestLogger?.error) {
        requestLogger.error(
          {
            ...payload,
            requestId: request?.id || request?.headers?.['x-request-id'],
            method: request?.method,
            path: request?.url,
          },
          'TypeORM exception encountered',
        );
      } else {
        this.logger.error(JSON.stringify(payload));
      }
    } else {
      this.logger.error(JSON.stringify(payload), stack);
    }

    const strategy = exceptionStrategy[ctxType];
    if (strategy) {
      throw strategy(message);
    }

    throw exception;
  }
}
