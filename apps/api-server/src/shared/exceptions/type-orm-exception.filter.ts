import { ExceptionFilter, Catch, ArgumentsHost, Logger, ConflictException } from '@nestjs/common';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

const exceptionStrategy = {
  http: (message) => new ConflictException(message),
};

@Catch(QueryFailedError, EntityNotFoundError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctxType = host.getType();
    const { message, stack } = exception;
    const ExceptionInstance = exceptionStrategy[ctxType](message);
    Logger.error(message, stack);
    throw ExceptionInstance;
  }
}
