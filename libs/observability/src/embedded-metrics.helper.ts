import { metricScope, MetricsLogger, Unit } from 'aws-embedded-metrics';

export interface QueueMetricCounts {
  waiting?: number;
  active?: number;
  delayed?: number;
  failed?: number;
  completed?: number;
  paused?: number;
}

export interface QueueMetricInput {
  namespace: string;
  environment: string;
  service: string;
  queueName: string;
  counts: QueueMetricCounts;
  timestamp?: Date;
}

function writeQueueMetrics(metrics: MetricsLogger, input: QueueMetricInput): void {
  metrics.setNamespace(input.namespace);
  metrics.putDimensions({
    Queue: input.queueName,
    Environment: input.environment,
    Service: input.service,
  });

  const { counts } = input;
  const metricPairs: Array<[keyof QueueMetricCounts, number | undefined]> = [
    ['waiting', counts.waiting],
    ['active', counts.active],
    ['delayed', counts.delayed],
    ['failed', counts.failed],
    ['completed', counts.completed],
    ['paused', counts.paused],
  ];

  metricPairs
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
    .forEach(([key, value]) => {
      metrics.putMetric(key, value as number, Unit.Count);
    });

  metrics.setProperty('queueName', input.queueName);
  metrics.setProperty('timestamp', (input.timestamp || new Date()).toISOString());
  metrics.setProperty('counts', counts);
}

export const emitQueueMetrics = metricScope((metrics) => async (input: QueueMetricInput) => {
  writeQueueMetrics(metrics, input);
});

export interface CronMetricInput {
  namespace: string;
  environment: string;
  service: string;
  jobName: string;
  durationMs: number;
  succeeded: boolean;
  processedCount?: number;
  itemCounts?: Record<string, number>;
  timestamp?: Date;
}

function writeCronMetrics(metrics: MetricsLogger, input: CronMetricInput): void {
  metrics.setNamespace(input.namespace);
  metrics.putDimensions({
    Job: input.jobName,
    Environment: input.environment,
    Service: input.service,
  });

  metrics.putMetric('CronDuration', input.durationMs, Unit.Milliseconds);
  metrics.putMetric('CronStatus', input.succeeded ? 1 : 0, Unit.Count);

  if (typeof input.processedCount === 'number' && Number.isFinite(input.processedCount)) {
    metrics.putMetric('CronProcessedCount', input.processedCount, Unit.Count);
  }

  metrics.setProperty('jobName', input.jobName);
  metrics.setProperty('timestamp', (input.timestamp || new Date()).toISOString());
  metrics.setProperty('itemCounts', input.itemCounts);
}

export const emitCronMetrics = metricScope((metrics) => async (input: CronMetricInput) => {
  writeCronMetrics(metrics, input);
});
