import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { getQueueToken } from '@nestjs/bull';
import { OpenAIService } from '@app/openai';
import { DateTime } from 'luxon';
import {
  IntegrationFactoryMock,
  OpenAIServiceMock,
  PlatformIntegrationsRepositoryMock,
  SentryServiceMock,
  ServiceMock,
  SyncedProjectsRepositoryMock,
  TaskTimeLogsRepositoryMock,
  ToDoRepositoryMock,
} from '../../../../test/mocks';
import { ToDoService } from './to-do.service';
import { ToDoRepository } from '../repositories/to-do.repository';
import { ToDoStatus } from '../domain/to-do-status.enum';
import {
  CompletedFocusBlockDummy,
  QueueMock,
  ToDoDBResponseDummy,
  dummyConvertBrainDumpDto,
  dummyConvertBrainDumpToTasksResponse,
  dummyRecentToDosDto,
  dummyRecentToDosResponse,
  dummySearchToDosDto,
  dummySearchToDosResponse,
  syncedProjectDummy,
  userDummy,
} from '../../../../test/dummies';
import { ToDo } from '../entities/to-do.entity';
import { TaskTimeLogsRepository } from '../repositories/task-time-logs.repository';
import { ToDoTimeLogDto } from '../dto/to-do-time-log.dto.ts';
import { TaskTimeLog } from '../entities/tasks-time-logs.entity';
import { SyncedProjectsRepository } from '../repositories/synced-projects.repository';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { IntegrationFactory } from '../../integration/services/IntegrationFactory';
import { PlatformIntegrationRepository } from '../../platform-integrations/repositories/platform-integration.repository';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { PaginationMetaDto } from '../../../shared/pagination/pagination-meta.dto';
import { PaginationDto } from '../../../shared/pagination/index.dto';
import { PageOrder } from '../../../shared/domain/page-order.enum';

describe('toDoService', () => {
  let toDoService: ToDoService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PlatformIntegrationRepository,
        IntegrationFactory,
        ToDoService,
        ToDoRepository,
        TaskTimeLogsRepository,
        SyncedProjectsRepository,
        OpenAIService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: getQueueToken(BullQueues.TIME_LOGS),
          useValue: QueueMock,
        },
      ],
    })
      .overrideProvider(IntegrationFactory)
      .useValue(IntegrationFactoryMock)
      .overrideProvider(ToDoRepository)
      .useValue(ToDoRepositoryMock)
      .overrideProvider(PlatformIntegrationRepository)
      .useValue(PlatformIntegrationsRepositoryMock)
      .overrideProvider(TaskTimeLogsRepository)
      .useValue(TaskTimeLogsRepositoryMock)
      .overrideProvider(SyncedProjectsRepository)
      .useValue(SyncedProjectsRepositoryMock)
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
      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([[], 0]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockResolvedValueOnce([]);

      const response = await toDoService.getToDos(userDummy.id, {
        status: ToDoStatus.NOT_STARTED,
        page: 1,
        take: 50,
        skip: 0,
        eisenhower_quadrant: 2,
        should_use_cache: true,
      });

      expect(response).toEqual(
        new PaginationDto(
          [],
          new PaginationMetaDto({ paginationOptionsDto: { page: 1, skip: 0, take: 50 }, itemCount: 0 }),
        ),
      );
    });

    it('positive: should filter by perspiration_gte and perspiration_lte', async () => {
      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([[], 0]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockResolvedValueOnce([]);

      await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        perspiration_gte: 3,
        perspiration_lte: 7,
        should_use_cache: true,
      });

      expect(ToDoRepositoryMock.getUserToDos).toHaveBeenCalledWith(
        userDummy.id,
        expect.objectContaining({ perspiration_gte: 3, perspiration_lte: 7 }),
      );
    });

    it('positive: should order by ASC', async () => {
      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([[], 0]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockResolvedValueOnce([]);

      await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        order: PageOrder.ASC,
        should_use_cache: true,
      });

      expect(ToDoRepositoryMock.getUserToDos).toHaveBeenCalledWith(
        userDummy.id,
        expect.objectContaining({ order: 'ASC' }),
      );
    });

    it('positive: should order by DESC', async () => {
      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([[], 0]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockResolvedValueOnce([]);

      await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        order: PageOrder.DESC,
        should_use_cache: true,
      });

      expect(ToDoRepositoryMock.getUserToDos).toHaveBeenCalledWith(
        userDummy.id,
        expect.objectContaining({ order: 'DESC' }),
      );
    });

    it('positive: should map top_score from repo result to PaginationDto', async () => {
      const mockToDos = [
        {
          id: 'todo-1',
          title: 'Test ToDo',
          user_id: userDummy.id,
        },
      ];
      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockToDos, 1]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockResolvedValueOnce(mockToDos);

      const response = await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        should_use_cache: true,
      });

      const data = response.data as ToDo[];
      expect(data[0].id).toBe('todo-1');
      expect(data[0].title).toBe('Test ToDo');
      expect(response.meta.itemCount).toBe(1);
    });

    it('positive: if to do is linked to an external project, its available statuses should be added to response', async () => {
      const toDoId = 'test-id';
      PlatformIntegrationsRepositoryMock.orm.find.mockResolvedValueOnce([{ platform: IntegrationPlatforms.ZOHO }]);
      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([
        [
          {
            ...ToDoDBResponseDummy,
            external_task_metadata: {
              platform: IntegrationPlatforms.ZOHO,
            },
            external_task_id: toDoId,
          },
        ],
        1,
      ]);
      SyncedProjectsRepositoryMock.orm.findOne.mockResolvedValueOnce(syncedProjectDummy);
      ServiceMock.getAllUserTasks.mockResolvedValueOnce([{ id: toDoId, external_status: 'test-id' }]);

      const response = await toDoService.getToDos(userDummy.id, {
        status: ToDoStatus.NOT_STARTED,
        page: 1,
        skip: 0,
        eisenhower_quadrant: 2,
        should_use_cache: false,
      });

      expect(response.data[0].external_statuses).toEqual(syncedProjectDummy.available_statuses);
      expect(response.data[0].current_external_status).toEqual({
        label: 'Open',
        status_id: 'test-id',
        should_complete_task: true,
      });
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
    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetAllMocks();
    });

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
      expect(QueueMock.add).toBeCalledWith(BullWorkers.SAVE_TASK_TIME_LOG, {
        userId: userDummy.id,
        toDoTimeLogs: [toDoTimeLogDummy],
        toDos: [ToDoDBResponseDummy],
      });
    });

    it('positive: if none of the tasks are from an external platform, no tasks should be added to queued job', async () => {
      const toDoTimeLogDummy: ToDoTimeLogDto = {
        id: ToDoDBResponseDummy.id,
        duration: 60,
        status: ToDoStatus.COMPLETED,
        is_billable: false,
      };
      ToDoRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          ...ToDoDBResponseDummy,
          external_task_id: null,
          external_task_metadata: null,
        },
      ]);

      await toDoService.logToDosTime([toDoTimeLogDummy], userDummy.id, CompletedFocusBlockDummy.id);

      expect(QueueMock.add).not.toBeCalled();
    });
  });

  describe('searchToDos', () => {
    it('positive: should fetch ToDos matched search title', async () => {
      const results = dummySearchToDosResponse
        .filter((todo) => todo.user_id === userDummy.id && todo.title.includes(dummySearchToDosDto.title))
        .slice(0, dummySearchToDosDto.take);
      ToDoRepositoryMock.searchUserToDos.mockResolvedValueOnce(results);
      const response = await toDoService.searchToDos(dummySearchToDosDto, userDummy.id);

      expect(ToDoRepositoryMock.searchUserToDos).toBeCalledWith(dummySearchToDosDto, userDummy.id);
      expect(response.length).toBeLessThanOrEqual(dummySearchToDosDto.take);
      expect(response).toEqual(results);
    });
  });

  describe('getRecentToDos', () => {
    it('positive: should fetch a recently updated ToDos before the specified date', async () => {
      const results = dummyRecentToDosResponse
        .filter(
          (todo) =>
            todo.user_id === userDummy.id &&
            DateTime.fromISO(todo.updated_at) >= DateTime.fromISO(dummyRecentToDosDto.updated_at),
        )
        .slice(0, dummyRecentToDosDto.take);
      ToDoRepositoryMock.getUserRecentToDos.mockResolvedValueOnce(results);
      const response = await toDoService.getRecentToDos(dummyRecentToDosDto, userDummy.id);

      expect(ToDoRepositoryMock.getUserRecentToDos).toBeCalledWith(dummyRecentToDosDto, userDummy.id);
      expect(response.length).toBeLessThanOrEqual(dummyRecentToDosDto.take);
      expect(response).toEqual(results);
    });
  });

  describe('createToDosFromBrainDump', () => {
    it('positive: should convert brain dump contents into a structured array of tasks in this format: [ { "task_name": "name", "estimated_duration_minutes": 20 }]', async () => {
      OpenAIServiceMock.convertBrainDumpToTasks.mockResolvedValue(dummyConvertBrainDumpToTasksResponse);
      const response = await toDoService.createToDosFromBrainDump(dummyConvertBrainDumpDto);

      expect(response.length).toBeLessThanOrEqual(dummyConvertBrainDumpToTasksResponse.length);
      expect(response).toEqual(dummyConvertBrainDumpToTasksResponse);
    });
  });
});
