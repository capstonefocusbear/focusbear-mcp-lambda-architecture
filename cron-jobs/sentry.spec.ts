import * as Sentry from '@sentry/node';
import { withSentry } from './sentry';

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  flush: jest.fn().mockResolvedValue(undefined),
  withScope: (cb: any) => cb({ setTag: jest.fn(), setUser: jest.fn(), setContext: jest.fn() }),
}));

describe('withSentry', () => {
  const origExit = process.exit;
  beforeEach(() => {
    jest.resetAllMocks();
  });
  afterAll(() => {
    // restore
    // eslint-disable-next-line no-global-assign, @typescript-eslint/no-empty-function
    process.exit = origExit as any;
  });

  test('does not exit when exitOnFinish is false', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    await withSentry(async () => 42, { exitOnFinish: false });
    expect(Sentry.flush).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  test('exits with 0 when exitOnFinish is true and success', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    await withSentry(async () => 42, { exitOnFinish: true });
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  test('exits with 1 when exitOnFinish is true and error', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    await expect(withSentry(async () => { throw new Error('boom'); }, { exitOnFinish: true })).rejects.toThrow('boom');
    expect(Sentry.captureException).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
