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

function toSafeMetricName(name: string): string {
  const sanitized = name.replace(/[^A-Za-z0-9_]/g, '');
  return sanitized || 'UnnamedCounter';
}

export interface AiPipelineMetricInput {
  namespace: string;
  environment: string;
  service: string;
  pipeline: string;
  operation: string;
  success: boolean;
  durationMs: number;
  stageDurationsMs: Record<string, number>;
  counters?: Record<string, number>;
  timestamp?: Date;
}

export async function emitAiPipelineMetrics(input: AiPipelineMetricInput): Promise<void> {
  try {
    const environment = input.environment || DEFAULT_ENVIRONMENT_DIMENSION;
    const timestamp = input.timestamp || new Date();
    const baseDimensions = createDimensions([
      ['Pipeline', input.pipeline],
      ['Operation', input.operation],
      ['Environment', environment],
      ['Service', input.service],
    ]);

    const metricData: MetricDatum[] = [
      createMetricDatum('AiPipelineDurationMs', input.durationMs, StandardUnit.Milliseconds, baseDimensions, timestamp),
      createMetricDatum('AiPipelineSuccess', input.success ? 1 : 0, StandardUnit.Count, baseDimensions, timestamp),
    ];

    Object.entries(input.stageDurationsMs || {})
      .filter(([, value]) => Number.isFinite(value))
      .forEach(([stage, value]) => {
        const stageDimensions = createDimensions([
          ['Pipeline', input.pipeline],
          ['Operation', input.operation],
          ['Stage', stage],
          ['Environment', environment],
          ['Service', input.service],
        ]);
        metricData.push(
          createMetricDatum('AiPipelineStageDurationMs', value, StandardUnit.Milliseconds, stageDimensions, timestamp),
        );
      });

    Object.entries(input.counters || {})
      .filter(([, value]) => Number.isFinite(value))
      .forEach(([counterName, value]) => {
        metricData.push(
          createMetricDatum(toSafeMetricName(counterName), value, StandardUnit.Count, baseDimensions, timestamp),
        );
      });

    if (!metricData.length) {
      return;
    }

    await cloudWatchClient.send(
      new PutMetricDataCommand({
        Namespace: input.namespace,
        MetricData: metricData,
      }),
    );
  } catch {
    // Best-effort only: metric failures must not affect request/job processing.
  }
}
