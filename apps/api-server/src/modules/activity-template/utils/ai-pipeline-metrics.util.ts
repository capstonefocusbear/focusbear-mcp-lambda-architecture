import { ConfigService } from '@nestjs/config';
import { MetricsConfig } from '../../../config/metrics.config';

const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  emitQueueMetrics: true,
  emitUserActivityMetrics: true,
  pollIntervalMs: 60_000,
  namespace: 'FocusBear/Queues',
  service: 'api',
  aiPipelineNamespace: 'FocusBear/Queues',
  aiPipelineService: 'api',
  environment: 'prod',
  logQueueFailures: true,
};

export function getActivityTemplateMetricsConfig(configService?: ConfigService): MetricsConfig {
  return configService?.get<MetricsConfig>('metrics') || DEFAULT_METRICS_CONFIG;
}

export function parseMetricsTimestamp(value?: string): number | undefined {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : undefined;
}
