import { Test, TestingModule } from '@nestjs/testing';
import { SentryModule } from './sentry.module';
import { SentryService } from './sentry.service';
import { SENTRY_TOKEN } from './sentry.constants';

jest.mock('@sentry/nestjs/setup', () => ({
  SentryModule: {
    forRoot: jest.fn(() => ({
      module: class MockSentryModule {},
      providers: [],
      exports: [],
    })),
  },
}));

describe('SentryModule', () => {
  it('should provide SentryService and SENTRY_TOKEN via forRoot', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SentryModule.forRoot()],
    }).compile();

    const sentryService = module.get<SentryService>(SentryService);
    const sentryToken = module.get(SENTRY_TOKEN);

    expect(sentryService).toBeDefined();
    expect(sentryService.instance).toBeDefined();
    expect(sentryToken).toBe(sentryService);
  });

  it('should provide SentryService via forRootAsync', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        SentryModule.forRootAsync({
          useFactory: () => ({ dsn: 'test-dsn' }),
        }),
      ],
    }).compile();

    expect(module.get<SentryService>(SentryService)).toBeDefined();
  });
});
