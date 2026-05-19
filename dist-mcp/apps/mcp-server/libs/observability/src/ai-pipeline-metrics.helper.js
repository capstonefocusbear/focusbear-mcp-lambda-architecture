"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitAiPipelineMetrics = emitAiPipelineMetrics;
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const Sentry = require("@sentry/nestjs");
const DEFAULT_ENVIRONMENT_DIMENSION = 'prod';
const resolvedRegion = process.env.CLOUDWATCH_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-southeast-2';
const cloudWatchClient = new client_cloudwatch_1.CloudWatchClient({ region: resolvedRegion });
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
function toSafeMetricName(name) {
    const sanitized = name.replace(/[^A-Za-z0-9_]/g, '');
    return sanitized || 'UnnamedCounter';
}
async function emitAiPipelineMetrics(input) {
    try {
        const environment = input.environment || DEFAULT_ENVIRONMENT_DIMENSION;
        const timestamp = input.timestamp || new Date();
        const baseDimensions = createDimensions([
            ['Pipeline', input.pipeline],
            ['Operation', input.operation],
            ['Environment', environment],
            ['Service', input.service],
        ]);
        const metricData = [];
        if (input.emitDurationMetric !== false && Number.isFinite(input.durationMs)) {
            metricData.push(createMetricDatum('AiPipelineDurationMs', input.durationMs, client_cloudwatch_1.StandardUnit.Milliseconds, baseDimensions, timestamp));
        }
        if (input.emitSuccessMetric !== false) {
            metricData.push(createMetricDatum('AiPipelineSuccess', input.success ? 1 : 0, client_cloudwatch_1.StandardUnit.Count, baseDimensions, timestamp));
        }
        if (Number.isFinite(input.endToEndDurationMs)) {
            metricData.push(createMetricDatum('AiPipelineEndToEndDurationMs', input.endToEndDurationMs, client_cloudwatch_1.StandardUnit.Milliseconds, baseDimensions, timestamp));
        }
        if (Number.isFinite(input.queueWaitMs)) {
            metricData.push(createMetricDatum('AiPipelineQueueWaitMs', input.queueWaitMs, client_cloudwatch_1.StandardUnit.Milliseconds, baseDimensions, timestamp));
        }
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
            metricData.push(createMetricDatum('AiPipelineStageDurationMs', value, client_cloudwatch_1.StandardUnit.Milliseconds, stageDimensions, timestamp));
        });
        Object.entries(input.counters || {})
            .filter(([, value]) => Number.isFinite(value))
            .forEach(([counterName, value]) => {
            metricData.push(createMetricDatum(toSafeMetricName(counterName), value, client_cloudwatch_1.StandardUnit.Count, baseDimensions, timestamp));
        });
        if (!metricData.length) {
            return;
        }
        await cloudWatchClient.send(new client_cloudwatch_1.PutMetricDataCommand({
            Namespace: input.namespace,
            MetricData: metricData,
        }));
    }
    catch (error) {
        Sentry.captureException(error, {
            level: 'warning',
            tags: {
                context: 'emit-ai-pipeline-metrics',
            },
            extra: {
                namespace: input.namespace,
                pipeline: input.pipeline,
                operation: input.operation,
                service: input.service,
            },
        });
    }
}
//# sourceMappingURL=ai-pipeline-metrics.helper.js.map