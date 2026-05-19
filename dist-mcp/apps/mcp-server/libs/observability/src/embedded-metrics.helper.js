"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitQueueMetrics = emitQueueMetrics;
exports.emitCronMetrics = emitCronMetrics;
exports.emitUserActivityMetric = emitUserActivityMetric;
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const DEFAULT_ENVIRONMENT_DIMENSION = 'prod';
const resolvedRegion = process.env.CLOUDWATCH_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-southeast-2';
const cloudWatchClient = new client_cloudwatch_1.CloudWatchClient({ region: resolvedRegion });
async function publishMetricData(namespace, metricData) {
    if (!metricData.length) {
        return;
    }
    await cloudWatchClient.send(new client_cloudwatch_1.PutMetricDataCommand({
        Namespace: namespace,
        MetricData: metricData,
    }));
}
function createDimensions(values) {
    return values
        .filter(([, value]) => typeof value === 'string' && value.length > 0)
        .map(([Name, Value]) => ({ Name, Value: Value }));
}
function createMetricDatum(metricName, value, unit, dimensions, timestamp) {
    return {
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Dimensions: dimensions,
        Timestamp: timestamp,
    };
}
async function emitQueueMetrics(input) {
    const environment = input.environment || DEFAULT_ENVIRONMENT_DIMENSION;
    const timestamp = input.timestamp || new Date();
    const baseDimensions = createDimensions([
        ['Queue', input.queueName],
        ['Environment', environment],
        ['Service', input.service],
    ]);
    const { counts } = input;
    const metricPairs = [
        ['waiting', counts.waiting],
        ['active', counts.active],
        ['delayed', counts.delayed],
        ['failed', counts.failed],
        ['completed', counts.completed],
        ['paused', counts.paused],
    ];
    const metricData = metricPairs
        .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
        .map(([metricName, value]) => createMetricDatum(metricName, value, client_cloudwatch_1.StandardUnit.Count, baseDimensions, timestamp));
    await publishMetricData(input.namespace, metricData);
}
async function emitCronMetrics(input) {
    const environment = input.environment || DEFAULT_ENVIRONMENT_DIMENSION;
    const timestamp = input.timestamp || new Date();
    const baseDimensions = createDimensions([
        ['Job', input.jobName],
        ['Environment', environment],
        ['Service', input.service],
    ]);
    const metricData = [
        createMetricDatum('CronDuration', input.durationMs, client_cloudwatch_1.StandardUnit.Milliseconds, baseDimensions, timestamp),
        createMetricDatum('CronStatus', input.succeeded ? 1 : 0, client_cloudwatch_1.StandardUnit.Count, baseDimensions, timestamp),
    ];
    if (typeof input.processedCount === 'number' && Number.isFinite(input.processedCount)) {
        metricData.push(createMetricDatum('CronProcessedCount', input.processedCount, client_cloudwatch_1.StandardUnit.Count, baseDimensions, timestamp));
    }
    await publishMetricData(input.namespace, metricData);
}
async function emitUserActivityMetric(input) {
    const environment = input.environment || DEFAULT_ENVIRONMENT_DIMENSION;
    const timestamp = new Date();
    const baseDimensions = createDimensions([
        ['Operation', input.operation],
        ['Environment', environment],
        ['Service', input.service],
    ]);
    const metricData = [
        createMetricDatum('LatencyMs', input.durationMs, client_cloudwatch_1.StandardUnit.Milliseconds, baseDimensions, timestamp),
        createMetricDatum('Success', input.success ? 1 : 0, client_cloudwatch_1.StandardUnit.Count, baseDimensions, timestamp),
    ];
    await publishMetricData(input.namespace, metricData);
}
//# sourceMappingURL=embedded-metrics.helper.js.map