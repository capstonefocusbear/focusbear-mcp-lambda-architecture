import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);

  private readonly exemptPaths = ['/activity-library/routine-suggestions'];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startedAt = Date.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<{
      method?: string;
      url?: string;
      id?: string;
      headers?: Record<string, any>;
      log?: any;
    }>();
    const requestLogger = request?.log;

    if (request?.url && this.exemptPaths.some((path) => request.url.startsWith(path))) {
      return next.handle();
    }

    return next.handle().pipe(
      timeout(30000),
      catchError((error) => {
        if (error instanceof TimeoutError) {
          const elapsedMs = Date.now() - startedAt;
          const payload = {
            event: 'RequestTimeoutException',
            requestId: request?.id || request?.headers?.['x-request-id'],
            method: request?.method,
            path: request?.url,
            elapsedMs,
          };

          if (requestLogger?.warn) {
            requestLogger.warn(payload, 'Request timed out');
          } else {
            this.logger.warn(JSON.stringify(payload));
          }

          return throwError(() => new RequestTimeoutException());
        }
        return throwError(() => error);
      }),
    );
  }
}
