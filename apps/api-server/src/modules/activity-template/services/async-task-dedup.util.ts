import { SentryService } from '@app/observability';
import { Job, Queue } from 'bull';

const IN_FLIGHT_JOB_STATES = new Set(['waiting', 'active', 'delayed', 'paused']);
const TERMINAL_JOB_STATES = new Set(['completed', 'failed']);

function extractAsyncTaskId(job: Job<unknown>): string | null {
  const data = (job.data ?? {}) as { asyncTaskId?: unknown };
  return typeof data.asyncTaskId === 'string' ? data.asyncTaskId : null;
}

export async function getInFlightAsyncTaskIdByJobId(queue: Queue, jobId: string): Promise<string | null> {
  const existingJob = await queue.getJob(jobId);
  if (!existingJob) {
    return null;
  }

  const state = await existingJob.getState();
  if (!IN_FLIGHT_JOB_STATES.has(state)) {
    return null;
  }

  return extractAsyncTaskId(existingJob);
}

export async function reuseInFlightOrCleanupTerminalJob({
  queue,
  queueName,
  sentry,
  jobId,
}: {
  queue: Queue;
  queueName: string;
  sentry: SentryService;
  jobId: string;
}): Promise<string | null> {
  const existingJob = await queue.getJob(jobId);
  if (!existingJob) {
    return null;
  }

  const state = await existingJob.getState();
  const existingAsyncTaskId = extractAsyncTaskId(existingJob);

  if (IN_FLIGHT_JOB_STATES.has(state) && existingAsyncTaskId) {
    return existingAsyncTaskId;
  }

  if (TERMINAL_JOB_STATES.has(state)) {
    try {
      await existingJob.remove();
    } catch (error) {
      sentry.instance().captureException(error, {
        level: 'warning',
        extra: { jobId, state, queue: queueName },
      });
    }
  }

  return null;
}
