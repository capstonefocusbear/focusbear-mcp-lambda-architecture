import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { AppModule } from '../src/app.module';

process.env.SENTRY_DSN = process.env.SENTRY_DSN || 'mock-sentry-dsn-for-testing';

jest.mock('@sentry/nestjs', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  withScope: jest.fn((callback) => callback({ setTag: jest.fn(), setContext: jest.fn() })),
}));

describe('Sentry Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // instrument.ts calls Sentry.init at import-time if SENTRY_DSN is set
    // (main.ts imports instrument.ts, but AppModule doesn't), so we load it explicitly for this test.
    await import('../src/instrument');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should initialize Sentry on app start when SENTRY_DSN is set', () => {
    expect(Sentry.init).toHaveBeenCalled();
  });
});
