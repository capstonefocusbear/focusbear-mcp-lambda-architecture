import { ConfigType, registerAs } from '@nestjs/config';

const DEFAULT_POLL_INTERVAL_MS = 60_000;

export const metricsConfig = registerAs('metrics', () => ({
  emitQueueMetrics: process.env.EMIT_QUEUE_METRICS !== 'false',
  pollIntervalMs: Number(process.env.QUEUE_METRICS_POLL_MS) || DEFAULT_POLL_INTERVAL_MS,
  namespace: process.env.QUEUE_METRICS_NAMESPACE || 'FocusBear/Queues',
  service: process.env.QUEUE_METRICS_SERVICE || 'api',
  environment: process.env.APP_ENV || process.env.SENTRY_ENV || process.env.NODE_ENV || 'development',
  logQueueFailures: process.env.LOG_QUEUE_FAILURES !== 'false',
}));

export type MetricsConfig = ConfigType<typeof metricsConfig>;
