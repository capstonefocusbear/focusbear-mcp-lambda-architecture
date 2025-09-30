// timing.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { randomUUID } from 'crypto';

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    const id = req.headers['x-request-id'] ?? randomUUID();
    res.setHeader('x-request-id', id);
    const t0 = process.hrtime.bigint();

    const done = (label: string) => {
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      const line = `[perf] ${label} ${req.method} ${req.url} status=${res.statusCode} rid=${id} ${ms.toFixed(1)}ms`;
      if (ms > 500) console.warn(line);
      else console.log(line);
    };

    return next.handle().pipe(
      tap(() => done('OK')),
      catchError((err) => {
        done(`ERR:${err?.name ?? 'Error'}`);
        return throwError(() => err);
      }),
    );
  }
}
