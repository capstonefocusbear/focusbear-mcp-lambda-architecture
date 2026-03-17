import { ConfigType, registerAs } from '@nestjs/config';

const DEFAULT_POLL_INTERVAL_MS = 60_000;
export const DEFAULT_QUEUE_METRICS_NAMESPACE = 'FocusBear/Queues';
export const DEFAULT_AI_PIPELINE_METRICS_NAMESPACE = 'FocusBear/AiPipelines';
export const DEFAULT_METRICS_SERVICE = 'api';

const resolveBoolean = (value?: string, fallback = true): boolean => {
  if (typeof value === 'undefined') {
    return fallback;
  }
  return value !== 'false';
};

export const metricsConfig = registerAs('metrics', () => {
  const emitQueueMetrics = resolveBoolean(process.env.EMIT_QUEUE_METRICS);
  const emitUserActivityMetrics = resolveBoolean(process.env.EMIT_USER_ACTIVITY_METRICS);
  const environment =
    process.env.METRICS_ENVIRONMENT || process.env.APP_ENV || process.env.SENTRY_ENV || process.env.NODE_ENV || 'prod';

  return {
    emitQueueMetrics,
    emitUserActivityMetrics,
    pollIntervalMs: Number(process.env.QUEUE_METRICS_POLL_MS) || DEFAULT_POLL_INTERVAL_MS,
    namespace: process.env.QUEUE_METRICS_NAMESPACE || DEFAULT_QUEUE_METRICS_NAMESPACE,
    service: process.env.QUEUE_METRICS_SERVICE || DEFAULT_METRICS_SERVICE,
    aiPipelineNamespace: process.env.AI_PIPELINE_METRICS_NAMESPACE || DEFAULT_AI_PIPELINE_METRICS_NAMESPACE,
    aiPipelineService:
      process.env.AI_PIPELINE_METRICS_SERVICE || process.env.QUEUE_METRICS_SERVICE || DEFAULT_METRICS_SERVICE,
    environment,
    logQueueFailures: resolveBoolean(process.env.LOG_QUEUE_FAILURES),
  };
});

export type MetricsConfig = ConfigType<typeof metricsConfig>;
