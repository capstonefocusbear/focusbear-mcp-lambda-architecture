import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@app/observability';
import { Job } from 'bull';
import { DateTime } from 'luxon';
import { ToDoTimeLogDto } from '../dto/to-do-time-log.dto.ts';
import { ToDo } from '../entities/to-do.entity';
import { BillingStatus } from '../../integration/domain/billing-status.enum';
import { IntegrationFactory } from '../../integration/services/IntegrationFactory';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';

@Processor(BullQueues.TIME_LOGS)
export class TimeLogsConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly integrationFactory: IntegrationFactory,
  ) {}

  @Process(BullWorkers.SAVE_TASK_TIME_LOG)
  async readOperationJob(
    job: Job<{
      userId: string;
      toDoTimeLogs: ToDoTimeLogDto[];
      toDos: ToDo[];
    }>,
  ) {
    const {
      data: { userId, toDoTimeLogs, toDos },
    } = job;
    try {
      for await (const timeLog of toDoTimeLogs) {
        const toDoRecord = toDos.find((toDo) => toDo.id === timeLog.id);
        if (!toDoRecord) {
          continue;
        }
        const portalId = toDoRecord.external_task_metadata.task_data.portal_id;
        const projectId = toDoRecord.external_task_metadata.task_data.project_id;
        const taskId = toDoRecord.external_task_metadata.task_data.id;
        const billStatus = timeLog.is_billable ? BillingStatus.BILLABLE : BillingStatus.NON_BILLABLE;
        const currentTime = DateTime.local();
        const date = currentTime.toFormat('yyyy-MM-dd');
        const createdTaskTimeEntry = {
          date,
          bill_status: billStatus,
          seconds: timeLog.duration,
          note: timeLog?.note,
        };

        const service = this.integrationFactory.get(toDoRecord.external_task_metadata?.platform);
        const addTimeEntryPromise = service.addTimeEntry(userId, portalId, projectId, taskId, createdTaskTimeEntry);
        const updateTaskStatusPromise = service.updateTaskStatus(userId, portalId, projectId, taskId, timeLog?.status);
        await Promise.all([addTimeEntryPromise, updateTaskStatusPromise]);
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      console.error('Error in save-task-time-log queued job: ', error);
    }
  }
}
