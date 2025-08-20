import * as Sentry from '@sentry/node';
require('dotenv').config();

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
export async function withSentry<T>(job: () => Promise<T>): Promise<T> {
  initializeSentry();
  try {
    const result = await job();
    return result;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  } finally {
    await Sentry.flush(2000);
    process.exit(1);
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
