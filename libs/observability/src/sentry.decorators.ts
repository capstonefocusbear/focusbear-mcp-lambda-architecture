import { Inject } from '@nestjs/common';
import { SENTRY_TOKEN } from './sentry.constants';

export const InjectSentry = () => Inject(SENTRY_TOKEN);

