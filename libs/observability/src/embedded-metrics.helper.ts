import {
  CloudWatchClient,
  Dimension,
  MetricDatum,
  PutMetricDataCommand,
  StandardUnit,
} from '@aws-sdk/client-cloudwatch';

const DEFAULT_ENVIRONMENT_DIMENSION = 'prod';
const resolvedRegion =
  process.env.CLOUDWATCH_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-southeast-2';
const cloudWatchClient = new CloudWatchClient({ region: resolvedRegion });

async function publishMetricData(namespace: string, metricData: MetricDatum[]): Promise<void> {
  if (!metricData.length) {
    return;
  }

  await cloudWatchClient.send(
    new PutMetricDataCommand({
      Namespace: namespace,
      MetricData: metricData,
    }),
  );
}

function createDimensions(values: Array<[string, string | undefined]>): Dimension[] {
  return values
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .map(([Name, Value]) => ({ Name, Value: Value as string }));
}

function createMetricDatum(
  metricName: string,
  value: number,
  unit: StandardUnit,
  dimensions: Dimension[],
  timestamp?: Date,
): MetricDatum {
  return {
    MetricName: metricName,
    Value: value,
    Unit: unit,
    Dimensions: dimensions,
    Timestamp: timestamp,
  };
}

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

export async function emitQueueMetrics(input: QueueMetricInput): Promise<void> {
  const environment = input.environment || DEFAULT_ENVIRONMENT_DIMENSION;
  const timestamp = input.timestamp || new Date();
  const baseDimensions = createDimensions([
    ['Queue', input.queueName],
    ['Environment', environment],
    ['Service', input.service],
  ]);

  const { counts } = input;
  const metricPairs: Array<[keyof QueueMetricCounts, number | undefined]> = [
    ['waiting', counts.waiting],
    ['active', counts.active],
    ['delayed', counts.delayed],
    ['failed', counts.failed],
    ['completed', counts.completed],
    ['paused', counts.paused],
  ];

  const metricData = metricPairs
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
    .map(([metricName, value]) =>
      createMetricDatum(metricName, value as number, StandardUnit.Count, baseDimensions, timestamp),
    );

  await publishMetricData(input.namespace, metricData);
}

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

export async function emitCronMetrics(input: CronMetricInput): Promise<void> {
  const environment = input.environment || DEFAULT_ENVIRONMENT_DIMENSION;
  const timestamp = input.timestamp || new Date();
  const baseDimensions = createDimensions([
    ['Job', input.jobName],
    ['Environment', environment],
    ['Service', input.service],
  ]);

  const metricData: MetricDatum[] = [
    createMetricDatum('CronDuration', input.durationMs, StandardUnit.Milliseconds, baseDimensions, timestamp),
    createMetricDatum('CronStatus', input.succeeded ? 1 : 0, StandardUnit.Count, baseDimensions, timestamp),
  ];

  if (typeof input.processedCount === 'number' && Number.isFinite(input.processedCount)) {
    metricData.push(
      createMetricDatum('CronProcessedCount', input.processedCount, StandardUnit.Count, baseDimensions, timestamp),
    );
  }

  await publishMetricData(input.namespace, metricData);
}

export interface UserActivityMetricInput {
  namespace: string;
  environment: string;
  service: string;
  operation: string;
  durationMs: number;
  success: boolean;
  userId?: string;
  errorName?: string;
  errorMessage?: string;
}

export async function emitUserActivityMetric(input: UserActivityMetricInput): Promise<void> {
  const environment = input.environment || DEFAULT_ENVIRONMENT_DIMENSION;
  const timestamp = new Date();
  const baseDimensions = createDimensions([
    ['Operation', input.operation],
    ['Environment', environment],
    ['Service', input.service],
  ]);

  const metricData: MetricDatum[] = [
    createMetricDatum('LatencyMs', input.durationMs, StandardUnit.Milliseconds, baseDimensions, timestamp),
    createMetricDatum('Success', input.success ? 1 : 0, StandardUnit.Count, baseDimensions, timestamp),
  ];

  await publishMetricData(input.namespace, metricData);
}
