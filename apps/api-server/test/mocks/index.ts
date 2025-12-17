export * from './services.mock';
export * from './repositories.mock';
export * from './accountability-buddy.mocks';

jest.mock('@sentry/nestjs', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((callback) => {
    const scope = {
      setTag: jest.fn(),
      setUser: jest.fn(),
      setContext: jest.fn(),
      setLevel: jest.fn(),
    };
    return callback(scope);
  }),
  cron: {
    instrumentCron: jest.fn(),
  },
}));

jest.mock('@sentry/nestjs/setup', () => ({
  SentryModule: {
    forRoot: jest.fn(() => ({
      module: class MockSentryModule {},
      providers: [],
      exports: [],
    })),
  },
  SentryGlobalFilter: jest.fn().mockImplementation(() => ({
    catch: jest.fn(),
  })),
}));
