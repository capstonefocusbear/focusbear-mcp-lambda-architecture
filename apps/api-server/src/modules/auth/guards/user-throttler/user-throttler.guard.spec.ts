import { ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { UserThrottlerGuard } from './user-throttler.guard';

describe('UserThrottlerGuard', () => {
  let guard: UserThrottlerGuard;

  beforeEach(() => {
    const options = {
      throttlers: [{ ttl: 60000, limit: 10 }],
    };
    const storageService = {} as ThrottlerStorage;
    const reflector = new Reflector();
    guard = new UserThrottlerGuard(options, storageService, reflector);
  });

  describe('getTracker', () => {
    it('should return user id when passport has user', async () => {
      const req = {
        raw: {
          passport: {
            user: { id: 'test-user-id' },
          },
        },
        ip: '127.0.0.1',
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('test-user-id');
    });

    it('should return IP when passport is not available', async () => {
      const req = {
        raw: {},
        ip: '127.0.0.1',
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('127.0.0.1');
    });

    it('should return IP when user is not in passport', async () => {
      const req = {
        raw: {
          passport: {},
        },
        ip: '192.168.1.1',
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('192.168.1.1');
    });
  });
});
