import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { TimeLogsConsumer } from './time-logs.consumer';
import { IntegrationFactory } from '../../integration/services/IntegrationFactory';
import { SentryServiceMock, IntegrationFactoryMock, ServiceMock } from '../../../../test/mocks';
import { ToDoTimeLogDto } from '../dto/to-do-time-log.dto.ts';
import { ToDo } from '../entities/to-do.entity';
import { BillingStatus } from '../../integration/domain/billing-status.enum';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { ToDoStatus } from '../domain/to-do-status.enum';
import { userDummy } from '../../../../test/dummies';

describe('TimeLogsConsumer', () => {
  let consumer: TimeLogsConsumer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeLogsConsumer,
        {
          provide: IntegrationFactory,
          useValue: IntegrationFactoryMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    }).compile();

    consumer = module.get<TimeLogsConsumer>(TimeLogsConsumer);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('readOperationJob', () => {
    it('positive: should successfully log time to external platform', async () => {
      const toDoTimeLog: ToDoTimeLogDto = {
        id: 'todo-1',
        duration: 3600,
        status: ToDoStatus.COMPLETED,
        is_billable: true,
      };

      const toDo: ToDo = {
        id: 'todo-1',
        user_id: userDummy.id,
        title: 'Test Task',
        external_task_id: 'ext-task-1',
        external_task_metadata: {
          platform: IntegrationPlatforms.ZOHO,
          task_data: {
            id: 'ext-task-1',
            portal_id: 'portal-123',
            project_id: 'project-456',
          },
        },
      } as ToDo;

      const job = {
        data: {
          userId: userDummy.id,
          toDoTimeLogs: [toDoTimeLog],
          toDos: [toDo],
        },
      } as Job;

      IntegrationFactoryMock.get.mockReturnValue(ServiceMock);
      ServiceMock.addTimeEntry.mockResolvedValue({ success: true });
      ServiceMock.updateTaskStatus.mockResolvedValue({ success: true });

      await consumer.readOperationJob(job);

      expect(IntegrationFactoryMock.get).toHaveBeenCalledWith(IntegrationPlatforms.ZOHO);
      expect(ServiceMock.addTimeEntry).toHaveBeenCalledWith(userDummy.id, 'portal-123', 'project-456', 'ext-task-1', {
        date: expect.any(String),
        bill_status: BillingStatus.BILLABLE,
        seconds: 3600,
        note: undefined,
      });
      expect(ServiceMock.updateTaskStatus).toHaveBeenCalledWith(
        userDummy.id,
        'portal-123',
        'project-456',
        'ext-task-1',
        ToDoStatus.COMPLETED,
      );
    });

    it('positive: should log time with NON_BILLABLE status when is_billable is false', async () => {
      const toDoTimeLog: ToDoTimeLogDto = {
        id: 'todo-2',
        duration: 1800,
        status: ToDoStatus.IN_PROGRESS,
        is_billable: false,
        note: 'Working on feature',
      };

      const toDo: ToDo = {
        id: 'todo-2',
        user_id: userDummy.id,
        title: 'Another Task',
        external_task_id: 'ext-task-2',
        external_task_metadata: {
          platform: IntegrationPlatforms.ZOHO,
          task_data: {
            id: 'ext-task-2',
            portal_id: 'portal-123',
            project_id: 'project-789',
          },
        },
      } as ToDo;

      const job = {
        data: {
          userId: userDummy.id,
          toDoTimeLogs: [toDoTimeLog],
          toDos: [toDo],
        },
      } as Job;

      IntegrationFactoryMock.get.mockReturnValue(ServiceMock);
      ServiceMock.addTimeEntry.mockResolvedValue({ success: true });
      ServiceMock.updateTaskStatus.mockResolvedValue({ success: true });

      await consumer.readOperationJob(job);

      expect(ServiceMock.addTimeEntry).toHaveBeenCalledWith(userDummy.id, 'portal-123', 'project-789', 'ext-task-2', {
        date: expect.any(String),
        bill_status: BillingStatus.NON_BILLABLE,
        seconds: 1800,
        note: 'Working on feature',
      });
    });

    it('positive: should process multiple time logs', async () => {
      const toDoTimeLogs: ToDoTimeLogDto[] = [
        {
          id: 'todo-1',
          duration: 3600,
          status: ToDoStatus.COMPLETED,
          is_billable: true,
        },
        {
          id: 'todo-2',
          duration: 1800,
          status: ToDoStatus.IN_PROGRESS,
          is_billable: false,
        },
      ];

      const toDos: ToDo[] = [
        {
          id: 'todo-1',
          user_id: userDummy.id,
          title: 'Task 1',
          external_task_id: 'ext-task-1',
          external_task_metadata: {
            platform: IntegrationPlatforms.ZOHO,
            task_data: {
              id: 'ext-task-1',
              portal_id: 'portal-123',
              project_id: 'project-456',
            },
          },
        } as ToDo,
        {
          id: 'todo-2',
          user_id: userDummy.id,
          title: 'Task 2',
          external_task_id: 'ext-task-2',
          external_task_metadata: {
            platform: IntegrationPlatforms.ZOHO,
            task_data: {
              id: 'ext-task-2',
              portal_id: 'portal-123',
              project_id: 'project-789',
            },
          },
        } as ToDo,
      ];

      const job = {
        data: {
          userId: userDummy.id,
          toDoTimeLogs,
          toDos,
        },
      } as Job;

      IntegrationFactoryMock.get.mockReturnValue(ServiceMock);
      ServiceMock.addTimeEntry.mockResolvedValue({ success: true });
      ServiceMock.updateTaskStatus.mockResolvedValue({ success: true });

      await consumer.readOperationJob(job);

      expect(ServiceMock.addTimeEntry).toHaveBeenCalledTimes(2);
      expect(ServiceMock.updateTaskStatus).toHaveBeenCalledTimes(2);
    });

    it('positive: should skip time log if toDo record is not found', async () => {
      const toDoTimeLog: ToDoTimeLogDto = {
        id: 'non-existent-todo',
        duration: 3600,
        status: ToDoStatus.COMPLETED,
        is_billable: true,
      };

      const job = {
        data: {
          userId: userDummy.id,
          toDoTimeLogs: [toDoTimeLog],
          toDos: [], // Empty array - no matching todo
        },
      } as Job;

      await consumer.readOperationJob(job);

      // Should not call integration factory or services
      expect(IntegrationFactoryMock.get).not.toHaveBeenCalled();
      expect(ServiceMock.addTimeEntry).not.toHaveBeenCalled();
      expect(ServiceMock.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('negative: should handle errors and log to Sentry', async () => {
      const toDoTimeLog: ToDoTimeLogDto = {
        id: 'todo-1',
        duration: 3600,
        status: ToDoStatus.COMPLETED,
        is_billable: true,
      };

      const toDo: ToDo = {
        id: 'todo-1',
        user_id: userDummy.id,
        title: 'Test Task',
        external_task_id: 'ext-task-1',
        external_task_metadata: {
          platform: IntegrationPlatforms.ZOHO,
          task_data: {
            id: 'ext-task-1',
            portal_id: 'portal-123',
            project_id: 'project-456',
          },
        },
      } as ToDo;

      const job = {
        data: {
          userId: userDummy.id,
          toDoTimeLogs: [toDoTimeLog],
          toDos: [toDo],
        },
      } as Job;

      const error = new Error('Integration API failed');
      IntegrationFactoryMock.get.mockReturnValue(ServiceMock);
      ServiceMock.addTimeEntry.mockRejectedValue(error);

      await consumer.readOperationJob(job);

      expect(SentryServiceMock.instance().captureException).toHaveBeenCalledWith(error, { level: 'error' });
    });

    it('positive: should handle different integration platforms', async () => {
      const toDoTimeLog: ToDoTimeLogDto = {
        id: 'todo-1',
        duration: 3600,
        status: ToDoStatus.COMPLETED,
        is_billable: true,
      };

      const toDo: ToDo = {
        id: 'todo-1',
        user_id: userDummy.id,
        title: 'Test Task',
        external_task_id: 'ext-task-1',
        external_task_metadata: {
          platform: IntegrationPlatforms.ASANA,
          task_data: {
            id: 'ext-task-1',
            portal_id: 'portal-asana',
            project_id: 'project-asana',
          },
        },
      } as ToDo;

      const job = {
        data: {
          userId: userDummy.id,
          toDoTimeLogs: [toDoTimeLog],
          toDos: [toDo],
        },
      } as Job;

      IntegrationFactoryMock.get.mockReturnValue(ServiceMock);
      ServiceMock.addTimeEntry.mockResolvedValue({ success: true });
      ServiceMock.updateTaskStatus.mockResolvedValue({ success: true });

      await consumer.readOperationJob(job);

      expect(IntegrationFactoryMock.get).toHaveBeenCalledWith(IntegrationPlatforms.ASANA);
    });
  });
});
