import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { getQueueToken } from '@nestjs/bull';
import { OpenAIService } from '@app/openai';
import {
  OpenAIServiceMock,
  SentryServiceMock,
  SyncedProjectsRepositoryMock,
  TaskTimeLogsRepositoryMock,
  ToDoRepositoryMock,
  ZohoServiceMock,
} from '../../../../test/mocks';
import { ToDoService } from './to-do.service';
import { ToDoRepository } from '../repositories/to-do.repository';
import { ToDoStatus } from '../domain/to-do-status.enum';
import {
  CompletedFocusBlockDummy,
  QueueMock,
  ToDoDBResponseDummy,
  syncedProjectDummy,
  userDummy,
} from '../../../../test/dummies';
import { ToDo } from '../entities/to-do.entity';
import { TaskTimeLogsRepository } from '../repositories/task-time-logs.repository';
import { ToDoTimeLogDto } from '../dto/to-do-time-log.dto.ts';
import { TaskTimeLog } from '../entities/tasks-time-logs.entity';
import { SyncedProjectsRepository } from '../repositories/synced-projects.repository';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { ZohoService } from '../../integration/services/zoho.service';

describe('toDoService', () => {
  let toDoService: ToDoService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ToDoService,
        ToDoRepository,
        TaskTimeLogsRepository,
        SyncedProjectsRepository,
        ZohoService,
        OpenAIService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: getQueueToken('time-logs'),
          useValue: QueueMock,
        },
      ],
    })
      .overrideProvider(ToDoRepository)
      .useValue(ToDoRepositoryMock)
      .overrideProvider(TaskTimeLogsRepository)
      .useValue(TaskTimeLogsRepositoryMock)
      .overrideProvider(SyncedProjectsRepository)
      .useValue(SyncedProjectsRepositoryMock)
      .overrideProvider(ZohoService)
      .useValue(ZohoServiceMock)
      .overrideProvider(OpenAIService)
      .useValue(OpenAIServiceMock)
      .compile();

    toDoService = moduleRef.get<ToDoService>(ToDoService);
  });

  it('should be defined', () => {
    expect(toDoService).toBeDefined();
  });

  const toDoDummy = {
    title: 'To Do Title',
    details: 'Some text...',
    eisenhower_quadrant: 3,
    status: ToDoStatus.IN_PROGRESS,
    tags: [],
  };

  describe('upsertToDo', () => {
    it('negative: should throw error if user tries to update another users to do', async () => {
      const toDoId = randomUUID();
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce({ ...toDoDummy, id: toDoId, user_id: randomUUID() });
      let exception;
      const errorMessage = `User with ID: ${userDummy.id} is not allowed to edit todo with ID: ${toDoId}!`;
      try {
        await toDoService.upsertToDo(userDummy.id, { ...toDoDummy, id: toDoId });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should save new incoming to do', async () => {
      await toDoService.upsertToDo(userDummy.id, toDoDummy);

      expect(ToDoRepositoryMock.orm.save).toBeCalledWith(
        new ToDo({ user_id: userDummy.id, ...toDoDummy, updated_at: expect.toBeDateString() }),
      );
    });
  });

  describe('getToDos', () => {
    it('positive: should fetch users to dos from DB', async () => {
      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([]);

      const response = await toDoService.getToDos(userDummy.id, {
        status: ToDoStatus.NOT_STARTED,
        page_num: 1,
        eisenhower_quadrant: 2,
        should_use_cache: true,
      });

      expect(response).toBeArray();
    });

    it('positive: if to do is linked to an external project, its available statuses should be added to response', async () => {
      const toDoId = 'test-id';
      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([
        {
          ...ToDoDBResponseDummy,
          external_task_metadata: {
            platform: IntegrationPlatforms.ZOHO,
          },
          external_task_id: toDoId,
        },
      ]);
      SyncedProjectsRepositoryMock.orm.findOne.mockResolvedValueOnce(syncedProjectDummy);
      ZohoServiceMock.getAllUserTasks.mockResolvedValueOnce([
        { id_string: toDoId, status: { id: toDoId, name: 'status-name' } },
      ]);

      const response = await toDoService.getToDos(userDummy.id, {
        status: ToDoStatus.NOT_STARTED,
        page_num: 1,
        eisenhower_quadrant: 2,
        should_use_cache: false,
      });

      expect(response[0].external_statuses).toEqual(syncedProjectDummy.available_statuses);
      expect(response[0].current_external_status).toEqual({ label: 'status-name', id: 'test-id' });
    });
  });

  describe('deleteToDo', () => {
    it('positive: should delete users to do from DB', async () => {
      const toDoId = randomUUID();
      await toDoService.deleteToDo(userDummy.id, toDoId);

      expect(ToDoRepositoryMock.orm.delete).toBeCalledWith({ user_id: userDummy.id, id: toDoId });
    });
  });

  describe('logToDosTime', () => {
    it('positive: todo statuses should be updated in Focus Bear DB', async () => {
      const toDoId = ToDoDBResponseDummy.id;
      const toDoTimeLogDummy: ToDoTimeLogDto = {
        id: toDoId,
        duration: 60,
        status: ToDoStatus.COMPLETED,
        is_billable: false,
      };
      ToDoRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          ...ToDoDBResponseDummy,
          external_task_metadata: { platform: IntegrationPlatforms.ZOHO },
        },
      ]);

      await toDoService.logToDosTime([toDoTimeLogDummy], userDummy.id, CompletedFocusBlockDummy.id);

      expect(ToDoRepositoryMock.update).toBeCalledWith(toDoId, { status: ToDoStatus.COMPLETED });
      expect(TaskTimeLogsRepositoryMock.orm.save).toBeCalledWith([
        new TaskTimeLog({
          user_id: userDummy.id,
          task_id: toDoId,
          duration_logged_seconds: toDoTimeLogDummy.duration,
          completed_focus_block_id: CompletedFocusBlockDummy.id,
        }),
      ]);
      expect(QueueMock.add).toBeCalled();
    });

    it('positive: To dos from external platforms should be added to queue to log time in external platform', async () => {
      const toDoId = ToDoDBResponseDummy.id;
      const toDoTimeLogDummy: ToDoTimeLogDto = {
        id: toDoId,
        duration: 60,
        status: ToDoStatus.COMPLETED,
        is_billable: false,
      };

      ToDoRepositoryMock.orm.find.mockResolvedValueOnce([ToDoDBResponseDummy]);

      await toDoService.logToDosTime([toDoTimeLogDummy], userDummy.id, CompletedFocusBlockDummy.id);

      expect(ToDoRepositoryMock.update).toBeCalledWith(toDoTimeLogDummy.id, { status: toDoTimeLogDummy.status });
      expect(TaskTimeLogsRepositoryMock.orm.save).toBeCalledWith([
        new TaskTimeLog({
          user_id: userDummy.id,
          duration_logged_seconds: 60,
          task_id: toDoId,
          completed_focus_block_id: CompletedFocusBlockDummy.id,
        }),
      ]);
      expect(QueueMock.add).toBeCalledWith('save-task-time-log', {
        userId: userDummy.id,
        toDoTimeLogs: [toDoTimeLogDummy],
        toDos: [ToDoDBResponseDummy],
      });
    });
  });
});
