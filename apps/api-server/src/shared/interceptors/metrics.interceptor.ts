import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { MetricsConfig } from '../../config/metrics.config';
import { emitUserActivityMetric } from '../../../../../libs/observability/src/embedded-metrics.helper';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MetricsInterceptor.name);

  constructor(private readonly config: ConfigService) {}

  private getMetricsConfig(): MetricsConfig {
    return (
      this.config.get<MetricsConfig>('metrics') || {
        emitQueueMetrics: true,
        emitUserActivityMetrics: true,
        pollIntervalMs: 60_000,
        namespace: 'FocusBear/API',
        service: 'api',
        environment: 'prod',
        logQueueFailures: true,
      }
    );
  }

  private async emitMetric(operation: string, durationMs: number, success: boolean, userId: string): Promise<void> {
    const metrics = this.getMetricsConfig();
    const shouldEmitMetrics = metrics.emitUserActivityMetrics ?? metrics.emitQueueMetrics ?? true;
    if (!shouldEmitMetrics) {
      return;
    }

    try {
      await emitUserActivityMetric({
        namespace: metrics.namespace,
        environment: metrics.environment,
        service: metrics.service,
        operation,
        durationMs,
        success,
        userId,
      });
    } catch (error) {
      this.logger.error(`Failed to emit ${operation} metrics`, error);
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const handlerName = context.getHandler().name;
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || 'anonymous';

    return next.handle().pipe(
      tap({
        next: () => {
          // Emit success metric
          const durationMs = Date.now() - startTime;
          this.emitMetric(handlerName, durationMs, true, userId).catch();
        },
        error: () => {
          // Emit error metric
          const durationMs = Date.now() - startTime;
          this.emitMetric(handlerName, durationMs, false, userId).catch();
        },
      }),
    );
  }
}
