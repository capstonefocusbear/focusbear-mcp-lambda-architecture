import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger, Optional } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { emitUserActivityMetric } from '@app/observability';
import { MetricsConfig } from '../../../../../libs/config/src/metrics.config';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MetricsInterceptor.name);

  constructor(@Optional() private readonly config?: ConfigService) {}

  private getMetricsConfig(): MetricsConfig {
    return (
      this.config?.get<MetricsConfig>('metrics') || {
        emitQueueMetrics: true,
        emitUserActivityMetrics: true,
        pollIntervalMs: 60_000,
        namespace: 'FocusBear/API',
        service: 'api',
        aiPipelineNamespace: 'FocusBear/API',
        aiPipelineService: 'api',
        environment: 'prod',
        logQueueFailures: true,
      }
    );
  }

  private async emitMetric(operation: string, durationMs: number, success: boolean, userId: string): Promise<void> {
    try {
      const metrics = this.getMetricsConfig();
      const shouldEmitMetrics = Boolean(metrics.emitUserActivityMetrics || metrics.emitQueueMetrics);
      if (!shouldEmitMetrics) {
        return;
      }

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
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to emit ${operation} metrics: ${message}`, stack);
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const handlerName = context.getHandler().name;
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || 'anonymous';
    let success = true;

    return next.handle().pipe(
      tap({
        error: () => {
          success = false;
        },
      }),
      finalize(() => {
        const durationMs = Date.now() - startTime;
        this.emitMetric(handlerName, durationMs, success, userId).catch(() => undefined);
      }),
    );
  }
}
