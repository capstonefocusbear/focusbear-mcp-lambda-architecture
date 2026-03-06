import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ExternalMcpTasksService } from './external-mcp-tasks.service';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { TaskCommentRepository } from '../../to-do/repositories/task-comment.repository';
import { McpScope } from '../domain/mcp-scopes.enum';

describe('ExternalMcpTasksService', () => {
  let service: ExternalMcpTasksService;

  const mockUserId = 'user-uuid-1234';
  const mockTaskId = 'task-uuid-5678';

  const mockToDoRepositoryMock = {
    getUserToDos: jest.fn(),
    orm: {
      findOne: jest.fn(),
    },
    update: jest.fn(),
  };

  const mockTaskCommentRepositoryMock = {
    orm: {
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalMcpTasksService,
        {
          provide: ToDoRepository,
          useValue: mockToDoRepositoryMock,
        },
        {
          provide: TaskCommentRepository,
          useValue: mockTaskCommentRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<ExternalMcpTasksService>(ExternalMcpTasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── listTasks ────────────────────────────────────────────────────────────────

  describe('listTasks', () => {
    const query = { page: 1, take: 10, skip: 0, order: 'ASC' } as any;

    it('should return PaginationDto when scope is present', async () => {
      const mockTasks = [{ id: mockTaskId, title: 'Test task' }];
      mockToDoRepositoryMock.getUserToDos.mockResolvedValueOnce([mockTasks, 1]);

      const result = await service.listTasks(mockUserId, [McpScope.TASKS_READ], query);

      expect(result).toHaveProperty('data', mockTasks);
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('itemCount', 1);
      expect(mockToDoRepositoryMock.getUserToDos).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should throw UnauthorizedException when tasks:read scope is missing', async () => {
      await expect(service.listTasks(mockUserId, [McpScope.TASKS_WRITE], query)).rejects.toThrow(UnauthorizedException);
      expect(mockToDoRepositoryMock.getUserToDos).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when scopes array is empty', async () => {
      await expect(service.listTasks(mockUserId, [], query)).rejects.toThrow(
        `Token missing required scope: ${McpScope.TASKS_READ}`,
      );
    });
  });

  // ── updateTaskStatus ──────────────────────────────────────────────────────────

  describe('updateTaskStatus', () => {
    const dto: any = { status: 'completed' };
    const mockTask = { id: mockTaskId, user_id: mockUserId, status: 'pending' };

    it('should update task status when scope and task are valid', async () => {
      mockToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(mockTask);
      mockToDoRepositoryMock.update.mockResolvedValueOnce({ ...mockTask, status: 'completed' } as any);

      const result = await service.updateTaskStatus(mockUserId, [McpScope.TASKS_WRITE], mockTaskId, dto);

      expect(result).toHaveProperty('status', 'completed');
      expect(mockToDoRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { id: mockTaskId, user_id: mockUserId },
      });
      expect(mockToDoRepositoryMock.update).toHaveBeenCalledWith(mockTaskId, { status: dto.status });
    });

    it('should throw UnauthorizedException when tasks:write scope is missing', async () => {
      await expect(service.updateTaskStatus(mockUserId, [McpScope.TASKS_READ], mockTaskId, dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockToDoRepositoryMock.orm.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task does not exist for this user', async () => {
      mockToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(service.updateTaskStatus(mockUserId, [McpScope.TASKS_WRITE], mockTaskId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockToDoRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException with the task id in the message', async () => {
      mockToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(service.updateTaskStatus(mockUserId, [McpScope.TASKS_WRITE], mockTaskId, dto)).rejects.toThrow(
        `Task with id ${mockTaskId} not found`,
      );
    });
  });

  // ── addNote ───────────────────────────────────────────────────────────────────

  describe('addNote', () => {
    const dto: any = { content: 'Great progress on this task!' };
    const mockTask = { id: mockTaskId, user_id: mockUserId };

    it('should add a note when scope and task are valid', async () => {
      const savedComment = {
        id: 'comment-uuid-0001',
        task_id: mockTaskId,
        user_id: mockUserId,
        content: dto.content,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      };

      mockToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(mockTask);
      mockTaskCommentRepositoryMock.orm.save.mockResolvedValueOnce(savedComment);

      const result = await service.addNote(mockUserId, [McpScope.TASKS_WRITE], mockTaskId, dto);

      expect(result).toHaveProperty('task_id', mockTaskId);
      expect(result).toHaveProperty('user_id', mockUserId);
      expect(result).toHaveProperty('content', dto.content);
      expect(mockToDoRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { id: mockTaskId, user_id: mockUserId },
      });
      expect(mockTaskCommentRepositoryMock.orm.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when tasks:write scope is missing', async () => {
      await expect(service.addNote(mockUserId, [McpScope.TASKS_READ], mockTaskId, dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockToDoRepositoryMock.orm.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task does not exist for this user', async () => {
      mockToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(service.addNote(mockUserId, [McpScope.TASKS_WRITE], mockTaskId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockTaskCommentRepositoryMock.orm.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException with the task id in the message', async () => {
      mockToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(service.addNote(mockUserId, [McpScope.TASKS_WRITE], mockTaskId, dto)).rejects.toThrow(
        `Task with id ${mockTaskId} not found`,
      );
    });
  });
});
