import { ConfigType, registerAs } from '@nestjs/config';

const DEFAULT_POLL_INTERVAL_MS = 60_000;

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
    namespace: process.env.QUEUE_METRICS_NAMESPACE || 'FocusBear/Queues',
    service: process.env.QUEUE_METRICS_SERVICE || 'api',
    environment,
    logQueueFailures: resolveBoolean(process.env.LOG_QUEUE_FAILURES),
  };
});

export type MetricsConfig = ConfigType<typeof metricsConfig>;
