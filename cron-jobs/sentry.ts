import * as Sentry from '@sentry/nestjs';
import * as dotenv from 'dotenv';
import { emitCronMetrics } from '@app/observability';
dotenv.config();

export function initializeSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.SENTRY_ENV || 'prod',
  });
}

// Wraps entire cron job to catch any errors and send them to Sentry.
// Always use this at the bottom of your cron job file.
// @param job - Your main cron job function
// @returns Whatever your job returns
// Example:
// WithSentry(runMyCronJob);
export async function withSentry<T>(
  job: () => Promise<T>,
  options: { exitOnFinish?: boolean } = {},
): Promise<T> {
  const { exitOnFinish = true } = options;
  initializeSentry();
  let succeeded = false;
  try {
    const result = await job();
    succeeded = true;
    return result;
  } catch (error) {
    Sentry.captureException(error);
    console.error(error);
    throw error;
  } finally {
    try {
      await Sentry.flush(2000);
    } catch (_) {}
    if (exitOnFinish) {
      // Exit with appropriate code after resources have been flushed
      // eslint-disable-next-line no-process-exit
      process.exit(succeeded ? 0 : 1);
    }
  }
}

function extractNumericCounts(result: any): Record<string, number> | undefined {
  if (!result || typeof result !== 'object') {
    return undefined;
  }

  return Object.entries(result).reduce<Record<string, number>>((acc, [key, value]) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export async function runCronWithTelemetry<T extends Record<string, any> | void>(
  jobName: string,
  job: () => Promise<T>,
  options: { exitOnFinish?: boolean } = {},
): Promise<T> {
  const { exitOnFinish = true } = options;
  const startedAt = Date.now();
  let exitCode = 1;
  let itemCounts: Record<string, number> | undefined;

  try {
    const result = await withSentry(async () => {
      const output = await job();
      itemCounts = extractNumericCounts(output);
      exitCode = 0;
      return output;
    }, { exitOnFinish: false });
    return result;
  } catch (error) {
    throw error;
  } finally {
    const environment =
      process.env.METRICS_ENVIRONMENT ||
      process.env.APP_ENV ||
      process.env.SENTRY_ENV ||
      process.env.NODE_ENV ||
      'prod';
    const service = process.env.CRON_METRICS_SERVICE || 'cron';
    const namespace = process.env.CRON_METRICS_NAMESPACE || 'FocusBear/Cron';

    try {
      const processedCount = itemCounts ? Object.values(itemCounts).reduce((total, count) => total + count, 0) : undefined;
      await emitCronMetrics({
        namespace,
        environment,
        service,
        jobName,
        durationMs: Date.now() - startedAt,
        succeeded: exitCode === 0,
        processedCount,
        itemCounts,
      });
    } catch (error) {
      console.error('Failed to emit cron metrics', error);
    }

    if (exitOnFinish) {
      // eslint-disable-next-line no-process-exit
      process.exit(exitCode);
    }
  }
}

// Captures an error to Sentry with additional context while also logging it locally.
// error - The error to capture
// context - Additional context to attach to the error
// options - Options for error handling
export function captureErrorWithContext(
  error: any,
  context: {
    operation?: string;
    userId?: string;
    teamId?: string;
    cronJob?: string;
    extra?: Record<string, any>;
  },
  options: {
    shouldThrow?: boolean;
    logLevel?: 'error' | 'warn';
  } = {},
): void {
  const { shouldThrow = false, logLevel = 'error' } = options;

  // Local logging with context
  const logMessage = context.operation ? `Error in ${context.operation}:` : 'Error occurred:';

  if (logLevel === 'error') {
    console.error(logMessage, error?.response || error);
  } else {
    console.warn(logMessage, error?.response || error);
  }

  // Send to Sentry with context
  Sentry.withScope((scope) => {
    if (context.operation) {
      scope.setTag('operation', context.operation);
    }
    if (context.cronJob) {
      scope.setTag('cron_job', context.cronJob);
    }
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    if (context.teamId) {
      scope.setContext('team', { id: context.teamId });
    }
    if (context.extra) {
      scope.setContext('extra_data', context.extra);
    }

    Sentry.captureException(error);
  });

  if (shouldThrow) {
    throw error;
  }
}
