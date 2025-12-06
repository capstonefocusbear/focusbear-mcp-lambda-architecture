import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV,
    release: process.env.SENTRY_RELEASE,
    debug: process.env.SENTRY_DEBUG === 'true',
  });
}

