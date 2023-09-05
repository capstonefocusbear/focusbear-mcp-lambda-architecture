import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { secondsToHHMM } from 'apps/api-server/src/shared/utils/helpers';
import { DateTime } from 'luxon';
import { UserRepository } from '../../user/repositories/user.repository';
import { ZohoService } from '../../zoho/services/zoho.service';
import { ToDoTimeLogDto } from '../dto/to-do-time-log.dto.ts';
import { ToDo } from '../entities/to-do.entity';
import { BillingStatus } from '../../zoho/domain/billing-status.enum';

@Processor('time-logs')
export class TimeLogsConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly userRepository: UserRepository,
    private readonly zohoService: ZohoService,
  ) {}

  @Process('save-task-time-log')
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
        const toDoRecord = toDos.find((toDo) => toDo.id === timeLog.todo_id);
        if (!toDoRecord) {
          // eslint-disable-next-line no-continue
          continue;
        }
        const portalId = toDoRecord.external_task_metadata.task_data.portal_id;
        const projectId = toDoRecord.external_task_metadata.task_data?.project?.id_string;
        const taskId = toDoRecord.external_task_metadata.task_data.id_string;
        const billStatus = timeLog.is_billable ? BillingStatus.BILLABLE : BillingStatus.NON_BILLABLE;
        const currentTime = DateTime.local();
        const date = currentTime.toFormat('yyyy-MM-dd');
        const createdTaskTimeEntry = {
          date,
          bill_status: billStatus,
          hours: secondsToHHMM(timeLog.duration_logged_seconds),
          notes: '',
        };
        await this.zohoService.addTimeEntry(userId, portalId, projectId, taskId, createdTaskTimeEntry);
      }
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      console.error('Error in save-task-time-log queued job: ', error);
    }
  }

  @Process('sync-projects-and-tasks')
  async readOperationJob2(
    job: Job<{
      userId: string;
    }>,
  ) {
    const {
      data: { userId },
    } = job;
    try {
      await this.zohoService.syncUserProjectsAndTasks(userId);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      console.error('Error in sync-projects-and-tasks queued job: ', error);
    }
  }
}
