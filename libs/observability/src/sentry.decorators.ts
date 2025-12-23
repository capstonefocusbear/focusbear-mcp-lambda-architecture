import { Inject } from '@nestjs/common';
import { SENTRY_TOKEN } from './sentry.constants';

export function InjectSentry(): ParameterDecorator {
  return Inject(SENTRY_TOKEN);
}
