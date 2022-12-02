import { registerAs } from '@nestjs/config';

export const sentryConfig = registerAs('sentry', () => ({
  dsn: process.env.SENTRY_DSN,
  debug: process.env.SENTRY_DEBUG,
  environment: process.env.SENTRY_ENV,
  release: process.env.SENTRY_RELEASE,
  logLevels: process.env.SENTRY_LOG_LEVELS,
}));
