import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueryFailedError } from 'typeorm';
import { TaskReactionService } from './task-reaction.service';
import { TaskReactionRepository } from '../repositories/task-reaction.repository';
import { ToDoRepository } from '../repositories/to-do.repository';
import { ProjectMemberRepository } from '../../project/repositories/project-member.repository';
import { ProjectMemberInvitationStatus } from '../../project/domain/project-member-invitation-status.enum';

const TaskReactionRepositoryMock = {
  orm: {
    save: jest.fn(),
  },
  getReactionsByTaskId: jest.fn(),
  getReactionByTaskUserEmoji: jest.fn(),
  deleteReactionByTaskUserEmoji: jest.fn(),
};

const ToDoRepositoryMock = {
  orm: {
    findOne: jest.fn(),
  },
};

const ProjectMemberRepositoryMock = {
  getMemberByProjectAndUser: jest.fn(),
};

describe('TaskReactionService', () => {
  let taskReactionService: TaskReactionService;

  const userDummy = {
    id: randomUUID(),
  };

  const taskDummy = {
    id: randomUUID(),
    user_id: userDummy.id,
    title: 'Test Task',
  };

  const reactionDummy = {
    id: randomUUID(),
    task_id: taskDummy.id,
    user_id: userDummy.id,
    emoji: '👍',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [TaskReactionService, TaskReactionRepository, ToDoRepository, ProjectMemberRepository],
    })
      .overrideProvider(TaskReactionRepository)
      .useValue(TaskReactionRepositoryMock)
      .overrideProvider(ToDoRepository)
      .useValue(ToDoRepositoryMock)
      .overrideProvider(ProjectMemberRepository)
      .useValue(ProjectMemberRepositoryMock)
      .compile();

    taskReactionService = moduleRef.get<TaskReactionService>(TaskReactionService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(taskReactionService).toBeDefined();
  });

  describe('createReaction', () => {
    it('positive: should create a new reaction', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskReactionRepositoryMock.getReactionByTaskUserEmoji.mockResolvedValueOnce(null);
      TaskReactionRepositoryMock.orm.save.mockResolvedValueOnce(reactionDummy);

      const result = await taskReactionService.createReaction(userDummy.id, taskDummy.id, { emoji: '👍' });

      expect(result.emoji).toBe('👍');
      expect(result.task_id).toBe(taskDummy.id);
      expect(result.user_id).toBe(userDummy.id);
    });

    it('negative: should throw NotFoundException when task does not exist', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(taskReactionService.createReaction(userDummy.id, randomUUID(), { emoji: '👍' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw ForbiddenException when user has no access to task', async () => {
      const otherTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null, project_id: null };
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(otherTask);

      await expect(taskReactionService.createReaction(userDummy.id, otherTask.id, { emoji: '👍' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('negative: should throw ConflictException when reaction already exists', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskReactionRepositoryMock.getReactionByTaskUserEmoji.mockResolvedValueOnce(reactionDummy);

      await expect(taskReactionService.createReaction(userDummy.id, taskDummy.id, { emoji: '👍' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('negative: should throw ConflictException when duplicate insert race hits unique constraint', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskReactionRepositoryMock.getReactionByTaskUserEmoji.mockResolvedValueOnce(null);
      TaskReactionRepositoryMock.orm.save.mockRejectedValueOnce(
        new QueryFailedError('INSERT INTO task_reactions ...', [], {
          name: 'QueryFailedError',
          message: 'duplicate key value violates unique constraint "UQ_task_user_emoji"',
          code: '23505',
          constraint: 'UQ_task_user_emoji',
        } as any),
      );

      await expect(taskReactionService.createReaction(userDummy.id, taskDummy.id, { emoji: '👍' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('positive: should allow assignee to create reaction', async () => {
      const assignedTask = { ...taskDummy, user_id: randomUUID(), assignee_id: userDummy.id };
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(assignedTask);
      TaskReactionRepositoryMock.getReactionByTaskUserEmoji.mockResolvedValueOnce(null);
      TaskReactionRepositoryMock.orm.save.mockResolvedValueOnce(reactionDummy);

      const result = await taskReactionService.createReaction(userDummy.id, assignedTask.id, { emoji: '👍' });

      expect(result.emoji).toBe('👍');
    });

    it('positive: should allow project member to create reaction', async () => {
      const projectId = randomUUID();
      const projectTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null, project_id: projectId };
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(projectTask);
      ProjectMemberRepositoryMock.getMemberByProjectAndUser.mockResolvedValueOnce({
        invitation_status: ProjectMemberInvitationStatus.ACCEPTED,
      });
      TaskReactionRepositoryMock.getReactionByTaskUserEmoji.mockResolvedValueOnce(null);
      TaskReactionRepositoryMock.orm.save.mockResolvedValueOnce(reactionDummy);

      const result = await taskReactionService.createReaction(userDummy.id, projectTask.id, { emoji: '👍' });

      expect(result.emoji).toBe('👍');
      expect(ProjectMemberRepositoryMock.getMemberByProjectAndUser).toHaveBeenCalledWith(projectId, userDummy.id);
    });
  });

  describe('getReactionsByTaskId', () => {
    it('positive: should return reactions for a task', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskReactionRepositoryMock.getReactionsByTaskId.mockResolvedValueOnce([reactionDummy]);

      const result = await taskReactionService.getReactionsByTaskId(userDummy.id, taskDummy.id);

      expect(result).toHaveLength(1);
      expect(result[0].emoji).toBe('👍');
    });

    it('positive: should return empty array when no reactions', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskReactionRepositoryMock.getReactionsByTaskId.mockResolvedValueOnce([]);

      const result = await taskReactionService.getReactionsByTaskId(userDummy.id, taskDummy.id);

      expect(result).toHaveLength(0);
    });

    it('negative: should throw NotFoundException when task does not exist', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(taskReactionService.getReactionsByTaskId(userDummy.id, randomUUID())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw ForbiddenException when user has no access', async () => {
      const otherTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null, project_id: null };
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(otherTask);

      await expect(taskReactionService.getReactionsByTaskId(userDummy.id, otherTask.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deleteReaction', () => {
    it('positive: should delete own reaction', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskReactionRepositoryMock.deleteReactionByTaskUserEmoji.mockResolvedValueOnce({ affected: 1 });

      await taskReactionService.deleteReaction(userDummy.id, taskDummy.id, '👍');

      expect(TaskReactionRepositoryMock.deleteReactionByTaskUserEmoji).toHaveBeenCalledWith(
        taskDummy.id,
        userDummy.id,
        '👍',
      );
    });

    it('negative: should throw NotFoundException when task does not exist', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(taskReactionService.deleteReaction(userDummy.id, randomUUID(), '👍')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw ForbiddenException when user has no access to task', async () => {
      const otherTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null, project_id: null };
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(otherTask);

      await expect(taskReactionService.deleteReaction(userDummy.id, otherTask.id, '👍')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('negative: should throw NotFoundException when reaction does not exist', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskReactionRepositoryMock.deleteReactionByTaskUserEmoji.mockResolvedValueOnce({ affected: 0 });

      await expect(taskReactionService.deleteReaction(userDummy.id, taskDummy.id, '👍')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw ForbiddenException when project member invitation is not accepted', async () => {
      const projectId = randomUUID();
      const projectTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null, project_id: projectId };
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(projectTask);
      ProjectMemberRepositoryMock.getMemberByProjectAndUser.mockResolvedValueOnce({
        invitation_status: ProjectMemberInvitationStatus.PENDING,
      });

      await expect(taskReactionService.deleteReaction(userDummy.id, projectTask.id, '👍')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
