import { Injectable } from '@nestjs/common';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class SentryService {
  instance() {
    return Sentry;
  }
}

