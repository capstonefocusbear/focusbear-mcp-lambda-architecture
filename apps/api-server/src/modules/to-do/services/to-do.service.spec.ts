import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
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

    it('negative: should log security warning when unauthorized update is attempted', async () => {
      const toDoId = randomUUID();
      const anotherUserId = randomUUID();
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce({ ...toDoDummy, id: toDoId, user_id: anotherUserId });

      try {
        await toDoService.upsertToDo(userDummy.id, { ...toDoDummy, id: toDoId });
      } catch (error) {
        // Expected to throw
      }

      expect(SentryServiceMock.instance().captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY: Unauthorized todo update attempt'),
        'warning',
      );
    });

    it('positive: should save new incoming to do', async () => {
      await toDoService.upsertToDo(userDummy.id, toDoDummy);

      expect(ToDoRepositoryMock.orm.save).toHaveBeenCalledWith(
        new ToDo({ user_id: userDummy.id, ...toDoDummy, updated_at: expect.toBeDateString() }),
      );
    });

    it('positive: should always set user_id to authenticated user regardless of input', async () => {
      const maliciousUserId = randomUUID();
      // Even if client sends a different user_id, it should be overwritten
      const maliciousToDo = { ...toDoDummy, user_id: maliciousUserId };

      await toDoService.upsertToDo(userDummy.id, maliciousToDo as any);

      expect(ToDoRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userDummy.id, // Should be the authenticated user, not the malicious one
        }),
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

    it('positive: should return correct pagination metadata for multiple pages', async () => {
      // Mock 25 todos with total count of 25
      const mockTodos = Array.from({ length: 10 }, (_, i) => ({
        id: `todo-${i}`,
        title: `Todo ${i}`,
        status: 'NOT_STARTED',
      }));

      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockTodos, 25]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockResolvedValueOnce(mockTodos);

      const response = await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        should_use_cache: true,
      });

      // Verify pagination metadata
      expect(response.meta).toEqual({
        page: 1,
        take: 10,
        order: 'ASC',
        itemCount: 25,
        pageCount: 3, // Math.ceil(25/10) = 3
        hasPreviousPage: false, // page 1
        hasNextPage: true, // page 1 < pageCount 3
      });
    });

    it('positive: should return correct pagination metadata for last page', async () => {
      // Mock 5 todos for last page with total count of 25
      const mockTodos = Array.from({ length: 5 }, (_, i) => ({
        id: `todo-${i}`,
        title: `Todo ${i}`,
        status: 'NOT_STARTED',
      }));

      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockTodos, 25]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockResolvedValueOnce(mockTodos);

      const response = await toDoService.getToDos(userDummy.id, {
        page: 3, // Last page
        take: 10,
        skip: 20, // (3-1) * 10
        should_use_cache: true,
      });

      // Verify pagination metadata for last page
      expect(response.meta).toEqual({
        page: 3,
        take: 10,
        order: 'ASC',
        itemCount: 25,
        pageCount: 3, // Math.ceil(25/10) = 3
        hasPreviousPage: true, // page 3 > 1
        hasNextPage: false, // page 3 = pageCount 3
      });
    });

    it('positive: should return correct pagination metadata for middle page', async () => {
      // Mock 10 todos for middle page with total count of 25
      const mockTodos = Array.from({ length: 10 }, (_, i) => ({
        id: `todo-${i}`,
        title: `Todo ${i}`,
        status: 'NOT_STARTED',
      }));

      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockTodos, 25]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockResolvedValueOnce(mockTodos);

      const response = await toDoService.getToDos(userDummy.id, {
        page: 2, // Middle page
        take: 10,
        skip: 10, // (2-1) * 10
        should_use_cache: true,
      });

      // Verify pagination metadata for middle page
      expect(response.meta).toEqual({
        page: 2,
        take: 10,
        order: 'ASC',
        itemCount: 25,
        pageCount: 3, // Math.ceil(25/10) = 3
        hasPreviousPage: true, // page 2 > 1
        hasNextPage: true, // page 2 < pageCount 3
      });
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
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('positive: should delete users to do from DB', async () => {
      const toDoId = randomUUID();
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce({ ...toDoDummy, id: toDoId, user_id: userDummy.id });
      ToDoRepositoryMock.orm.delete.mockResolvedValueOnce({ affected: 1, raw: [] });

      await toDoService.deleteToDo(userDummy.id, toDoId);

      expect(ToDoRepositoryMock.orm.delete).toHaveBeenCalledWith({ user_id: userDummy.id, id: toDoId });
    });

    it('negative: should throw UnauthorizedException when user tries to delete another users todo', async () => {
      const toDoId = randomUUID();
      const anotherUserId = randomUUID();
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce({ ...toDoDummy, id: toDoId, user_id: anotherUserId });

      let exception;
      try {
        await toDoService.deleteToDo(userDummy.id, toDoId);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toContain('not allowed to delete todo');
      expect(ToDoRepositoryMock.orm.delete).not.toHaveBeenCalled();
    });

    it('negative: should log security warning when unauthorized deletion is attempted', async () => {
      const toDoId = randomUUID();
      const anotherUserId = randomUUID();
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce({ ...toDoDummy, id: toDoId, user_id: anotherUserId });

      try {
        await toDoService.deleteToDo(userDummy.id, toDoId);
      } catch (error) {
        // Expected to throw
      }

      expect(SentryServiceMock.instance().captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY: Unauthorized todo deletion attempt'),
        'warning',
      );
    });

    it('positive: should handle deletion of non-existent todo gracefully', async () => {
      const toDoId = randomUUID();
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      ToDoRepositoryMock.orm.delete.mockResolvedValueOnce({ affected: 0, raw: [] });

      await toDoService.deleteToDo(userDummy.id, toDoId);

      expect(ToDoRepositoryMock.orm.delete).toHaveBeenCalledWith({ user_id: userDummy.id, id: toDoId });
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

      expect(ToDoRepositoryMock.update).toHaveBeenCalledWith(toDoId, { status: ToDoStatus.COMPLETED });
      expect(TaskTimeLogsRepositoryMock.orm.save).toHaveBeenCalledWith([
        new TaskTimeLog({
          user_id: userDummy.id,
          task_id: toDoId,
          duration_logged_seconds: toDoTimeLogDummy.duration,
          completed_focus_block_id: CompletedFocusBlockDummy.id,
        }),
      ]);
      expect(QueueMock.add).toHaveBeenCalled();
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

      expect(ToDoRepositoryMock.update).toHaveBeenCalledWith(toDoTimeLogDummy.id, { status: toDoTimeLogDummy.status });
      expect(TaskTimeLogsRepositoryMock.orm.save).toHaveBeenCalledWith([
        new TaskTimeLog({
          user_id: userDummy.id,
          duration_logged_seconds: 60,
          task_id: toDoId,
          completed_focus_block_id: CompletedFocusBlockDummy.id,
        }),
      ]);
      expect(QueueMock.add).toHaveBeenCalledWith(BullWorkers.SAVE_TASK_TIME_LOG, {
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

      expect(QueueMock.add).not.toHaveBeenCalled();
    });
  });

  describe('searchToDos', () => {
    it('positive: should fetch ToDos matched search title', async () => {
      const results = dummySearchToDosResponse
        .filter((todo) => todo.user_id === userDummy.id && todo.title.includes(dummySearchToDosDto.title))
        .slice(0, dummySearchToDosDto.take);
      ToDoRepositoryMock.searchUserToDos.mockResolvedValueOnce(results);
      const response = await toDoService.searchToDos(dummySearchToDosDto, userDummy.id);

      expect(ToDoRepositoryMock.searchUserToDos).toHaveBeenCalledWith(dummySearchToDosDto, userDummy.id);
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

      expect(ToDoRepositoryMock.getUserRecentToDos).toHaveBeenCalledWith(dummyRecentToDosDto, userDummy.id);
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

  describe('getToDos - subtasks filtering', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('positive: should filter out empty array subtasks and return only valid subtasks', async () => {
      const mockToDosWithInvalidSubtasks = [
        {
          id: 'todo-1',
          title: 'TODO !!!!!',
          user_id: userDummy.id,
          subtasks: [
            [],
            [],
            { name: 'Valid Subtask 1', is_completed: false },
            [],
            { name: 'Valid Subtask 2', is_completed: true },
            [],
          ],
        },
      ];

      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockToDosWithInvalidSubtasks, 1]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockImplementation((todos) => Promise.resolve(todos));

      const response = await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        should_use_cache: true,
      });

      const data = response.data as any[];
      expect(data[0].subtasks).toHaveLength(2);
      expect(data[0].subtasks).toEqual([
        { name: 'Valid Subtask 1', is_completed: false },
        { name: 'Valid Subtask 2', is_completed: true },
      ]);
    });

    it('positive: should filter out null and undefined subtasks', async () => {
      const mockToDosWithNullSubtasks = [
        {
          id: 'todo-2',
          title: 'Test Todo',
          user_id: userDummy.id,
          subtasks: [
            null,
            { name: 'Valid Subtask', is_completed: false },
            undefined,
            { name: 'Another Valid', is_completed: true },
          ],
        },
      ];

      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockToDosWithNullSubtasks, 1]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockImplementation((todos) => Promise.resolve(todos));

      const response = await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        should_use_cache: true,
      });

      const data = response.data as any[];
      expect(data[0].subtasks).toHaveLength(2);
      expect(data[0].subtasks).toEqual([
        { name: 'Valid Subtask', is_completed: false },
        { name: 'Another Valid', is_completed: true },
      ]);
    });

    it('positive: should filter out objects missing required fields', async () => {
      const mockToDosWithIncompleteSubtasks = [
        {
          id: 'todo-3',
          title: 'Test Todo',
          user_id: userDummy.id,
          subtasks: [
            { name: 'Valid Subtask', is_completed: false },
            { name: 'Missing is_completed field' }, // Missing is_completed
            { is_completed: true }, // Missing name
            { something_else: 'value' }, // Missing both required fields
            { name: 'Another Valid', is_completed: true },
          ],
        },
      ];

      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockToDosWithIncompleteSubtasks, 1]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockImplementation((todos) => Promise.resolve(todos));

      const response = await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        should_use_cache: true,
      });

      const data = response.data as any[];
      expect(data[0].subtasks).toHaveLength(2);
      expect(data[0].subtasks).toEqual([
        { name: 'Valid Subtask', is_completed: false },
        { name: 'Another Valid', is_completed: true },
      ]);
    });

    it('positive: should return empty array when all subtasks are invalid', async () => {
      const mockToDosWithAllInvalidSubtasks = [
        {
          id: 'todo-4',
          title: 'Test Todo',
          user_id: userDummy.id,
          subtasks: [[], [], null, undefined, { invalid: 'data' }],
        },
      ];

      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockToDosWithAllInvalidSubtasks, 1]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockImplementation((todos) => Promise.resolve(todos));

      const response = await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        should_use_cache: true,
      });

      const data = response.data as any[];
      expect(data[0].subtasks).toEqual([]);
    });

    it('positive: should return empty array when subtasks is not an array', async () => {
      const mockToDosWithNonArraySubtasks = [
        {
          id: 'todo-5',
          title: 'Test Todo',
          user_id: userDummy.id,
          subtasks: null,
        },
      ];

      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockToDosWithNonArraySubtasks, 1]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockImplementation((todos) => Promise.resolve(todos));

      const response = await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        should_use_cache: true,
      });

      const data = response.data as any[];
      expect(data[0].subtasks).toEqual([]);
    });

    it('positive: should preserve valid subtasks with extra fields', async () => {
      const mockToDosWithExtraFields = [
        {
          id: 'todo-6',
          title: 'Test Todo',
          user_id: userDummy.id,
          subtasks: [
            { name: 'Subtask with ID', is_completed: false, id: 'subtask-123' },
            { name: 'Subtask with metadata', is_completed: true, created_at: '2024-01-01' },
          ],
        },
      ];

      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockToDosWithExtraFields, 1]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockImplementation((todos) => Promise.resolve(todos));

      const response = await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        should_use_cache: true,
      });

      const data = response.data as any[];
      expect(data[0].subtasks).toHaveLength(2);
      expect(data[0].subtasks[0]).toHaveProperty('id', 'subtask-123');
      expect(data[0].subtasks[1]).toHaveProperty('created_at', '2024-01-01');
    });

    it('positive: should normalize subtasks when should_use_cache is false', async () => {
      const mockToDosWithInvalidSubtasks = [
        {
          id: 'todo-7',
          title: 'Test Todo',
          user_id: userDummy.id,
          subtasks: [[], { name: 'Valid', is_completed: false }, []],
        },
      ];

      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockToDosWithInvalidSubtasks, 1]);
      PlatformIntegrationsRepositoryMock.orm.find.mockResolvedValueOnce([]);

      const response = await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        should_use_cache: false,
      });

      const data = response.data as any[];
      expect(data[0].subtasks).toHaveLength(1);
      expect(data[0].subtasks).toEqual([{ name: 'Valid', is_completed: false }]);
    });

    it('positive: should filter out subtasks with empty or whitespace-only names', async () => {
      const mockToDosWithEmptyNames = [
        {
          id: 'todo-8',
          title: 'Test Todo',
          user_id: userDummy.id,
          subtasks: [
            { name: '', is_completed: false }, // Empty string
            { name: '   ', is_completed: true }, // Whitespace only
            { name: 'Valid Subtask', is_completed: false }, // Valid
            { name: '\t\n', is_completed: true }, // Tabs and newlines
          ],
        },
      ];

      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockToDosWithEmptyNames, 1]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockImplementation((todos) => Promise.resolve(todos));

      const response = await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        should_use_cache: true,
      });

      const data = response.data as any[];
      expect(data[0].subtasks).toHaveLength(1);
      expect(data[0].subtasks).toEqual([{ name: 'Valid Subtask', is_completed: false }]);
    });

    it('positive: should filter out subtasks with non-boolean is_completed values', async () => {
      const mockToDosWithInvalidTypes = [
        {
          id: 'todo-9',
          title: 'Test Todo',
          user_id: userDummy.id,
          subtasks: [
            { name: 'Valid', is_completed: true }, // Valid
            { name: 'Invalid string', is_completed: 'false' }, // String instead of boolean
            { name: 'Invalid number', is_completed: 0 }, // Number instead of boolean
            { name: 'Invalid null', is_completed: null }, // Null instead of boolean
            { name: 'Another Valid', is_completed: false }, // Valid
          ],
        },
      ];

      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockToDosWithInvalidTypes, 1]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockImplementation((todos) => Promise.resolve(todos));

      const response = await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        should_use_cache: true,
      });

      const data = response.data as any[];
      expect(data[0].subtasks).toHaveLength(2);
      expect(data[0].subtasks).toEqual([
        { name: 'Valid', is_completed: true },
        { name: 'Another Valid', is_completed: false },
      ]);
    });

    it('positive: should filter out subtasks with non-string name values', async () => {
      const mockToDosWithInvalidNames = [
        {
          id: 'todo-10',
          title: 'Test Todo',
          user_id: userDummy.id,
          subtasks: [
            { name: 'Valid', is_completed: true }, // Valid
            { name: 123, is_completed: false }, // Number instead of string
            { name: null, is_completed: true }, // Null instead of string
            { name: { text: 'object' }, is_completed: false }, // Object instead of string
          ],
        },
      ];

      ToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockToDosWithInvalidNames, 1]);
      ToDoRepositoryMock.addCachedStatusesToToDos.mockImplementation((todos) => Promise.resolve(todos));

      const response = await toDoService.getToDos(userDummy.id, {
        page: 1,
        take: 10,
        skip: 0,
        should_use_cache: true,
      });

      const data = response.data as any[];
      expect(data[0].subtasks).toHaveLength(1);
      expect(data[0].subtasks).toEqual([{ name: 'Valid', is_completed: true }]);
    });
  });
});
