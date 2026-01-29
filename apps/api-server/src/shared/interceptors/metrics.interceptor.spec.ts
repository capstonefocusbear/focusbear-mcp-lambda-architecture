import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';

jest.mock('@app/observability', () => ({
  emitUserActivityMetric: jest.fn(),
}));

const { emitUserActivityMetric } = jest.requireMock('@app/observability') as {
  emitUserActivityMetric: jest.Mock;
};

describe('MetricsInterceptor', () => {
  beforeEach(() => {
    emitUserActivityMetric.mockReset();
  });

  const buildContext = (userId?: string): ExecutionContext =>
    ({
      getHandler: () => function getSettings() {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: userId ? { id: userId } : undefined,
        }),
      }),
    } as unknown as ExecutionContext);

  const buildNext = (observable: any): CallHandler =>
    ({
      handle: () => observable,
    } as unknown as CallHandler);

  it('emits one success metric on completion', async () => {
    const interceptor = new MetricsInterceptor(undefined);

    await lastValueFrom(interceptor.intercept(buildContext('user-123'), buildNext(of('ok'))));

    expect(emitUserActivityMetric).toHaveBeenCalledTimes(1);
    expect(emitUserActivityMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'getSettings',
        success: true,
        userId: 'user-123',
      }),
    );
  });

  it('emits one failure metric on error', async () => {
    const interceptor = new MetricsInterceptor(undefined);

    await expect(
      lastValueFrom(interceptor.intercept(buildContext('user-123'), buildNext(throwError(() => new Error('boom'))))),
    ).rejects.toThrow('boom');

    expect(emitUserActivityMetric).toHaveBeenCalledTimes(1);
    expect(emitUserActivityMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'getSettings',
        success: false,
        userId: 'user-123',
      }),
    );
  });

  it('does not crash the request if metric emission rejects', async () => {
    emitUserActivityMetric.mockRejectedValueOnce(new Error('cloudwatch down'));
    const interceptor = new MetricsInterceptor(undefined);

    await expect(lastValueFrom(interceptor.intercept(buildContext('user-123'), buildNext(of('ok'))))).resolves.toBe(
      'ok',
    );

    expect(emitUserActivityMetric).toHaveBeenCalledTimes(1);
  });

  it("falls back to 'anonymous' when request has no user", async () => {
    const interceptor = new MetricsInterceptor(undefined);

    await lastValueFrom(interceptor.intercept(buildContext(undefined), buildNext(of('ok'))));

    expect(emitUserActivityMetric).toHaveBeenCalledTimes(1);
    expect(emitUserActivityMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'anonymous',
      }),
    );
  });
});
