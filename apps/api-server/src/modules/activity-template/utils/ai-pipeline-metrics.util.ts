import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_AI_PIPELINE_METRICS_NAMESPACE,
  DEFAULT_METRICS_SERVICE,
  DEFAULT_QUEUE_METRICS_NAMESPACE,
  MetricsConfig,
} from '../../../../../../libs/config/src/metrics.config';

const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  emitQueueMetrics: true,
  emitUserActivityMetrics: true,
  pollIntervalMs: 60_000,
  namespace: DEFAULT_QUEUE_METRICS_NAMESPACE,
  service: DEFAULT_METRICS_SERVICE,
  aiPipelineNamespace: DEFAULT_AI_PIPELINE_METRICS_NAMESPACE,
  aiPipelineService: DEFAULT_METRICS_SERVICE,
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
