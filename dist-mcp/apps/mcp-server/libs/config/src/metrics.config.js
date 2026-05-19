"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsConfig = exports.DEFAULT_METRICS_SERVICE = exports.DEFAULT_AI_PIPELINE_METRICS_NAMESPACE = exports.DEFAULT_QUEUE_METRICS_NAMESPACE = void 0;
const config_1 = require("@nestjs/config");
const DEFAULT_POLL_INTERVAL_MS = 60000;
exports.DEFAULT_QUEUE_METRICS_NAMESPACE = 'FocusBear/Queues';
exports.DEFAULT_AI_PIPELINE_METRICS_NAMESPACE = 'FocusBear/AiPipelines';
exports.DEFAULT_METRICS_SERVICE = 'api';
const resolveBoolean = (value, fallback = true) => {
    if (typeof value === 'undefined') {
        return fallback;
    }
    return value !== 'false';
};
exports.metricsConfig = (0, config_1.registerAs)('metrics', () => {
    const emitQueueMetrics = resolveBoolean(process.env.EMIT_QUEUE_METRICS);
    const emitUserActivityMetrics = resolveBoolean(process.env.EMIT_USER_ACTIVITY_METRICS);
    const environment = process.env.METRICS_ENVIRONMENT || process.env.APP_ENV || process.env.SENTRY_ENV || process.env.NODE_ENV || 'prod';
    return {
        emitQueueMetrics,
        emitUserActivityMetrics,
        pollIntervalMs: Number(process.env.QUEUE_METRICS_POLL_MS) || DEFAULT_POLL_INTERVAL_MS,
        namespace: process.env.QUEUE_METRICS_NAMESPACE || exports.DEFAULT_QUEUE_METRICS_NAMESPACE,
        service: process.env.QUEUE_METRICS_SERVICE || exports.DEFAULT_METRICS_SERVICE,
        aiPipelineNamespace: process.env.AI_PIPELINE_METRICS_NAMESPACE || exports.DEFAULT_AI_PIPELINE_METRICS_NAMESPACE,
        aiPipelineService: process.env.AI_PIPELINE_METRICS_SERVICE || process.env.QUEUE_METRICS_SERVICE || exports.DEFAULT_METRICS_SERVICE,
        environment,
        logQueueFailures: resolveBoolean(process.env.LOG_QUEUE_FAILURES),
    };
});
//# sourceMappingURL=metrics.config.js.map