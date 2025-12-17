// Mock @sentry/nestjs before any imports that use it
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import * as Sentry from '@sentry/nestjs';

jest.mock('@sentry/nestjs', () => {
  const mockScope = {
    setTag: jest.fn(),
    setUser: jest.fn(),
    setContext: jest.fn(),
    setLevel: jest.fn(),
  };

  return {
    init: jest.fn(),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    flush: jest.fn().mockResolvedValue(true),
    withScope: jest.fn((callback) => {
      return callback(mockScope);
    }),
    cron: {
      instrumentCron: jest.fn(),
    },
    SentryTraced: jest.fn(() => () => {}),
    SentryCron: jest.fn(() => () => {}),
  };
});

describe('SentryGlobalFilter', () => {
  let filter: SentryGlobalFilter;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new SentryGlobalFilter();
    jest.clearAllMocks();

    mockHost = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => ({ method: 'GET', url: '/test' }),
        getResponse: () => ({ status: jest.fn() }),
      }),
    } as any;
  });

  it('should capture exceptions to Sentry', () => {
    const error = new Error('Test error');
    filter.catch(error, mockHost);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(Sentry.withScope).toHaveBeenCalled();
  });

  it('should handle HttpException', () => {
    const httpException = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    filter.catch(httpException, mockHost);
    expect(Sentry.captureException).toHaveBeenCalledWith(httpException);
  });

  it('should handle non-HTTP contexts', () => {
    const error = new Error('Test error');
    const nonHttpHost = {
      getType: jest.fn().mockReturnValue('rpc'),
      switchToHttp: jest.fn().mockReturnValue(null),
    } as any;

    expect(() => filter.catch(error, nonHttpHost)).not.toThrow();
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });
});
