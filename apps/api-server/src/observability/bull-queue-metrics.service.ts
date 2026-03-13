import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SentryCron } from '@sentry/nestjs';
import { QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { getQueueToken } from '@nestjs/bull-shared';
import { emitQueueMetrics, QueueMetricCounts } from '@app/observability';
import { MetricsConfig } from '../config/metrics.config';
import { BullQueues } from '../shared/utils/constants';

type RedisLike = {
  quit?: () => Promise<unknown>;
  disconnect?: () => void | Promise<unknown>;
};

type QueueLike = {
  name: string;
  getJobCounts: (...args: any[]) => Promise<Record<string, number>>;
  opts?: { connection?: any };
};

interface QueueDescriptor {
  name: string;
  queue: QueueLike;
}

@Injectable()
export class BullQueueMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BullQueueMetricsService.name);

  private readonly queueEvents: Array<{ instance: QueueEvents; client?: RedisLike }> = [];

  private queues: QueueDescriptor[] = [];

  constructor(private readonly configService: ConfigService, private readonly moduleRef: ModuleRef) {}

  async onModuleInit(): Promise<void> {
    this.queues = this.resolveQueues();

    const metrics = this.getMetricsConfig();
    if (!metrics.logQueueFailures) {
      return;
    }

    await Promise.all(
      this.queues.map(async ({ name, queue }) => {
        const connection = (queue.opts as any)?.connection;
        if (!connection) {
          return;
        }

        const { connection: queueEventsConnection, client } = this.createDedicatedConnection(connection);

        try {
          const queueEvents = new QueueEvents(name, {
            connection: queueEventsConnection,
          });
          await queueEvents.waitUntilReady();

          queueEvents.on('failed', (event) => {
            const failedEvent = event as { jobId: string; failedReason: string; prev?: string; attemptsMade?: number };
            const logPayload = {
              event: 'BullQueueJobFailed',
              queue: name,
              jobId: failedEvent.jobId,
              failedReason: failedEvent.failedReason,
              prevState: failedEvent.prev,
              attemptsMade: failedEvent.attemptsMade,
            };
            this.logger.error(JSON.stringify(logPayload), undefined, 'BullQueueJobFailed');
          });

          this.queueEvents.push({ instance: queueEvents, client });
        } catch (error) {
          await this.disposeDedicatedClient(client);
          this.logger.error(
            `Failed to initialise queue events for ${name}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      this.queueEvents.map(async ({ instance, client }) => {
        try {
          await instance.close();
        } catch (error) {
          this.logger.warn(`Unable to close queue events for ${instance.name}: ${error}`);
        } finally {
          await this.disposeDedicatedClient(client);
        }
      }),
    );
    this.queueEvents.length = 0;
  }

  @SentryCron('publish-queue-depth-metrics')
  @Cron(CronExpression.EVERY_MINUTE)
  async publishQueueDepthMetrics(): Promise<void> {
    const metrics = this.getMetricsConfig();

    if (!metrics.emitQueueMetrics || this.queues.length === 0) {
      return;
    }

    await Promise.all(
      this.queues.map(async ({ name, queue }) => {
        try {
          const counts = await queue.getJobCounts();
          const metricCounts: QueueMetricCounts = {
            waiting: counts.waiting,
            active: counts.active,
            delayed: counts.delayed,
            failed: counts.failed,
            completed: counts.completed,
            paused: counts.paused,
          };
          await emitQueueMetrics({
            namespace: metrics.namespace,
            environment: metrics.environment,
            service: metrics.service,
            queueName: name,
            counts: metricCounts,
          });
        } catch (error) {
          this.logger.error(
            `Failed to emit metrics for queue ${name}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }),
    );
  }

  private resolveQueues(): QueueDescriptor[] {
    const queueNames: string[] = Object.values(BullQueues);
    const resolvedQueues: QueueDescriptor[] = [];

    queueNames.forEach((queueName) => {
      const token = getQueueToken(queueName);
      try {
        const queue = this.moduleRef.get<QueueLike>(token, { strict: false });
        if (queue) {
          resolvedQueues.push({ name: queueName, queue });
        }
      } catch {
        this.logger.debug(`Queue ${queueName} not registered in current context; skipping metrics.`);
      }
    });

    return resolvedQueues;
  }

  private getMetricsConfig(): MetricsConfig {
    return (
      this.configService.get<MetricsConfig>('metrics') || {
        emitQueueMetrics: true,
        emitUserActivityMetrics: true,
        pollIntervalMs: 60_000,
        namespace: 'FocusBear/Queues',
        service: 'api',
        aiPipelineNamespace: 'FocusBear/Queues',
        aiPipelineService: 'api',
        environment: 'prod',
        logQueueFailures: true,
      }
    );
  }

  private createDedicatedConnection(connection: any): { connection: any; client?: RedisLike } {
    if (connection && typeof connection.duplicate === 'function') {
      const duplicate = connection.duplicate();
      return { connection: duplicate, client: duplicate };
    }

    if (connection instanceof IORedis) {
      const duplicate = new IORedis(connection.options);
      return { connection: duplicate, client: duplicate };
    }

    if (connection && typeof connection === 'object') {
      return { connection: { ...connection } };
    }

    return { connection };
  }

  private async disposeDedicatedClient(client?: RedisLike): Promise<void> {
    if (!client) {
      return;
    }

    try {
      if (typeof client.quit === 'function') {
        await client.quit();
        return;
      }
      if (typeof client.disconnect === 'function') {
        await client.disconnect();
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanly close QueueEvents Redis client: ${error}`);
    }
  }
}
