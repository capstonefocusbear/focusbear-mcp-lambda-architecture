import { Logger } from '@nestjs/common';
import { safeDecodeURIComponent, timed, withTimeout } from './helpers';

describe('safeDecodeURIComponent', () => {
  describe('Windows bug report fix - handling + as spaces', () => {
    it('should convert + signs to spaces (Windows URL encoding)', () => {
      const input = 'The+app+keeps+crashing';
      const expected = 'The app keeps crashing';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });

    it('should handle multiple + signs in a row', () => {
      const input = 'Too++many+++spaces';
      const expected = 'Too  many   spaces';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });

    it('should handle + and %20 mixed encoding', () => {
      const input = 'This+has%20mixed+spaces';
      const expected = 'This has mixed spaces';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });

    it('should handle complex feedback message with special characters', () => {
      const input = 'App+crashed+when+using+%22focus+mode%22';
      const expected = 'App crashed when using "focus mode"';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });

    it('should handle feedback with punctuation', () => {
      const input = 'Great+app%2C+but+needs+improvement%21';
      const expected = 'Great app, but needs improvement!';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(safeDecodeURIComponent('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(safeDecodeURIComponent(null as any)).toBe(null);
      expect(safeDecodeURIComponent(undefined as any)).toBe(undefined);
    });

    it('should handle string with no encoding', () => {
      const input = 'No encoding here';
      expect(safeDecodeURIComponent(input)).toBe('No encoding here');
    });

    it('should handle malformed URI component gracefully', () => {
      const input = 'Invalid%encoding';
      // Should return original string on error
      const result = safeDecodeURIComponent(input);
      expect(typeof result).toBe('string');
    });

    it('should handle unicode characters with +', () => {
      const input = 'Hello+%E4%B8%96%E7%95%8C';
      const expected = 'Hello 世界';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });
  });

  describe('Real-world Windows bug report examples', () => {
    it('should decode typical Windows crash report', () => {
      const input = 'The+application+crashed+while+opening+the+settings+panel.+Error+code%3A+0x0001';
      const expected = 'The application crashed while opening the settings panel. Error code: 0x0001';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });

    it('should decode Windows path in feedback', () => {
      const input = 'Cannot+save+file+to+C%3A%5CUsers%5CPublic';
      const expected = 'Cannot save file to C:\\Users\\Public';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });

    it('should handle multi-line feedback (with %0A or %0D%0A)', () => {
      const input = 'First+line%0ASecond+line%0AThird+line';
      const expected = 'First line\nSecond line\nThird line';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });
  });
});

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('suppresses later rejection after timing out', async () => {
    const unhandled = jest.fn();
    const handler = () => unhandled();
    process.on('unhandledRejection', handler);

    try {
      const lateRejection = new Promise<void>((_, reject) => setTimeout(() => reject(new Error('late')), 2000));
      const promise = withTimeout(lateRejection, 1000);

      jest.advanceTimersByTime(1000);
      await expect(promise).rejects.toThrow('Operation timed out');

      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();

      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', handler);
    }
  });

  it('awaits onTimeout callback before rejecting', async () => {
    const onTimeout = jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 500)));
    const neverResolves = new Promise<void>(() => {});
    const promise = withTimeout(neverResolves, 1000, 'Operation timed out', onTimeout);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    jest.advanceTimersByTime(500);
    await expect(promise).rejects.toThrow('Operation timed out');
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});

describe('timed', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      warn: jest.fn(),
    } as unknown as Logger;
  });

  it('should return result and duration for successful operations', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const result = await timed(operation, {
      operationName: 'test_operation',
      budgetMs: 1000,
      logger: mockLogger,
    });

    expect(result.result).toBe('success');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should log warning when budget is exceeded', async () => {
    const slowOperation = () => new Promise<string>((resolve) => setTimeout(() => resolve('done'), 50));

    const result = await timed(slowOperation, {
      operationName: 'slow_operation',
      budgetMs: 10,
      logger: mockLogger,
    });

    expect(result.result).toBe('done');
    expect(result.durationMs).toBeGreaterThanOrEqual(50);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Performance budget exceeded for slow_operation'),
      expect.objectContaining({
        operationName: 'slow_operation',
        budgetMs: 10,
        actualMs: expect.any(Number),
        exceededByMs: expect.any(Number),
      }),
    );
  });

  it('should propagate errors while still logging warnings for slow failed operations', async () => {
    const failingOperation = () =>
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('operation failed')), 50));

    await expect(
      timed(failingOperation, {
        operationName: 'failing_operation',
        budgetMs: 10,
        logger: mockLogger,
      }),
    ).rejects.toThrow('operation failed');

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Performance budget exceeded for failing_operation (failed)'),
      expect.objectContaining({
        operationName: 'failing_operation',
        error: 'operation failed',
      }),
    );
  });

  it('should include context in warning logs', async () => {
    const slowOperation = () => new Promise<string>((resolve) => setTimeout(() => resolve('done'), 50));

    await timed(slowOperation, {
      operationName: 'contextualized_operation',
      budgetMs: 10,
      logger: mockLogger,
      context: { user_id: 'test-user-123', request_id: 'req-456' },
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        user_id: 'test-user-123',
        request_id: 'req-456',
      }),
    );
  });

  it('should not log warning when operation completes within budget', async () => {
    const fastOperation = jest.fn().mockResolvedValue('fast');

    await timed(fastOperation, {
      operationName: 'fast_operation',
      budgetMs: 1000,
      logger: mockLogger,
    });

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should propagate errors without logging when within budget', async () => {
    const fastFailingOperation = jest.fn().mockRejectedValue(new Error('fast failure'));

    await expect(
      timed(fastFailingOperation, {
        operationName: 'fast_failing_operation',
        budgetMs: 1000,
        logger: mockLogger,
      }),
    ).rejects.toThrow('fast failure');

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});
