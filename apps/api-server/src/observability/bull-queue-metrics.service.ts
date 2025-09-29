import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueEvents } from 'bullmq';
import { getQueueToken } from '@nestjs/bull-shared';
import { emitQueueMetrics, QueueMetricCounts } from '@app/observability';
import { MetricsConfig } from '../config/metrics.config';
import { BullQueues } from '../shared/utils/constants';

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

  private readonly queueEvents: QueueEvents[] = [];

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
        try {
          const connection = (queue.opts as any)?.connection;
          if (!connection) {
            return;
          }

          const queueEvents = new QueueEvents(name, {
            connection,
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
          this.queueEvents.push(queueEvents);
        } catch (error) {
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
      this.queueEvents.map(async (queueEvent) => {
        try {
          await queueEvent.close();
        } catch (error) {
          this.logger.warn(`Unable to close queue events for ${queueEvent.name}: ${error}`);
        }
      }),
    );
  }

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
        pollIntervalMs: 60_000,
        namespace: 'FocusBear/Queues',
        service: 'api',
        environment: process.env.APP_ENV || process.env.SENTRY_ENV || process.env.NODE_ENV || 'development',
        logQueueFailures: true,
      }
    );
  }
}
