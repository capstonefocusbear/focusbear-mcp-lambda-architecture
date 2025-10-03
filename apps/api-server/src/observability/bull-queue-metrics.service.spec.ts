import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bull-shared';
import { BullQueueMetricsService } from './bull-queue-metrics.service';
import { BullQueues } from '../shared/utils/constants';

const queueEventsInstances: Array<{
  waitUntilReady: jest.Mock;
  on: jest.Mock;
  close: jest.Mock;
  client: { setMaxListeners: jest.Mock; stream?: { setMaxListeners: jest.Mock } };
}> = [];

jest.mock('bullmq', () => ({
  QueueEvents: jest.fn().mockImplementation(() => {
    const instance = {
      waitUntilReady: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
      client: {
        setMaxListeners: jest.fn(),
        stream: {
          setMaxListeners: jest.fn(),
        },
      },
    };
    queueEventsInstances.push(instance);
    return instance;
  }),
}));

const { QueueEvents } = jest.requireMock('bullmq');

describe('BullQueueMetricsService', () => {
  const trackedQueues = new Map<
    string,
    {
      baseConnection: { duplicate: jest.Mock };
      duplicatedConnection: { quit: jest.Mock; disconnect?: jest.Mock };
    }
  >();

  const buildQueue = (name: string) => {
    const duplicatedConnection = {
      quit: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
    const baseConnection = {
      duplicate: jest.fn(() => duplicatedConnection),
    };
    trackedQueues.set(name, { baseConnection: baseConnection as any, duplicatedConnection });

    return {
      name,
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        delayed: 0,
        failed: 0,
        completed: 0,
        paused: 0,
      }),
      opts: {
        connection: baseConnection,
      },
    };
  };

  let moduleRef: ModuleRef;
  let configService: ConfigService;
  let service: BullQueueMetricsService;

  beforeEach(() => {
    jest.clearAllMocks();
    queueEventsInstances.length = 0;
    trackedQueues.clear();

    const queues = [buildQueue(BullQueues.STATS), buildQueue(BullQueues.USER_DATA)];

    const queueMap = new Map(queues.map((queue) => [getQueueToken(queue.name), queue]));

    moduleRef = {
      get: jest.fn((token: string) => {
        const queue = queueMap.get(token);
        if (!queue) {
          throw new Error('Queue not available in this test');
        }
        return queue;
      }),
    } as unknown as ModuleRef;

    configService = {
      get: jest.fn().mockReturnValue({
        emitQueueMetrics: true,
        logQueueFailures: true,
        namespace: 'FocusBear/Queues',
        environment: 'test',
        service: 'api',
      }),
    } as unknown as ConfigService;

    service = new BullQueueMetricsService(configService, moduleRef);
  });

  it('creates QueueEvents with duplicated Redis connections and cleans them up on destroy', async () => {
    await service.onModuleInit();

    Array.from(trackedQueues.values()).forEach(({ baseConnection }) => {
      expect(baseConnection.duplicate.mock.calls.length).toBe(1);
    });

    queueEventsInstances.forEach((_instance, index) => {
      const [queueName, optionsPassed] = (QueueEvents as jest.Mock).mock.calls[index];
      const tracked = trackedQueues.get(queueName);
      expect(tracked).toBeDefined();
      if (!tracked) {
        return;
      }

      const duplicateResult = tracked.baseConnection.duplicate.mock.results[0]?.value;
      expect(optionsPassed.connection).not.toBe(tracked.baseConnection as unknown);
      expect(duplicateResult).toBe(tracked.duplicatedConnection);
      expect(optionsPassed.connection).toBe(duplicateResult);
    });

    await service.onModuleDestroy();

    queueEventsInstances.forEach((instance) => {
      expect(instance.close).toHaveBeenCalledTimes(1);
    });

    trackedQueues.forEach(({ duplicatedConnection }) => {
      expect(duplicatedConnection.quit).toHaveBeenCalledTimes(1);
    });
  });
});
