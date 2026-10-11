import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV,
    release: process.env.SENTRY_RELEASE,
    debug: process.env.SENTRY_DEBUG === 'true',
    beforeSend(event) {
      if (event.request?.url?.split('?')[0].includes('/oauth/')) {
        event.request.url = event.request.url.split('?')[0];
        delete event.request.query_string;
        delete event.request.data;
        delete event.request.cookies;
        event.request.headers = {};
        // HTTP breadcrumbs can contain callback codes or secret-bearing form requests.
        event.breadcrumbs = event.breadcrumbs?.filter((breadcrumb) => breadcrumb.type !== 'http');
      }
      return event;
    },
  });
}
