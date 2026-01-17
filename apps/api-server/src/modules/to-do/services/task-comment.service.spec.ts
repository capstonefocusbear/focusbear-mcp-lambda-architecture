import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TaskCommentService } from './task-comment.service';
import { TaskCommentRepository } from '../repositories/task-comment.repository';
import { ToDoRepository } from '../repositories/to-do.repository';

const TaskCommentRepositoryMock = {
  orm: {
    save: jest.fn(),
    delete: jest.fn(),
  },
  getCommentsByTaskId: jest.fn(),
  getCommentById: jest.fn(),
  deleteComment: jest.fn(),
  update: jest.fn(),
};

const ToDoRepositoryMock = {
  orm: {
    findOne: jest.fn(),
  },
};

describe('TaskCommentService', () => {
  let taskCommentService: TaskCommentService;

  const userDummy = {
    id: randomUUID(),
  };

  const taskDummy = {
    id: randomUUID(),
    user_id: userDummy.id,
    title: 'Test Task',
  };

  const commentDummy = {
    id: randomUUID(),
    task_id: taskDummy.id,
    user_id: userDummy.id,
    content: 'Test comment',
    user: userDummy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [TaskCommentService, TaskCommentRepository, ToDoRepository],
    })
      .overrideProvider(TaskCommentRepository)
      .useValue(TaskCommentRepositoryMock)
      .overrideProvider(ToDoRepository)
      .useValue(ToDoRepositoryMock)
      .compile();

    taskCommentService = moduleRef.get<TaskCommentService>(TaskCommentService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(taskCommentService).toBeDefined();
  });

  describe('createComment', () => {
    it('positive: should create a new comment', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskCommentRepositoryMock.orm.save.mockResolvedValueOnce(commentDummy);
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);

      const result = await taskCommentService.createComment(userDummy.id, taskDummy.id, {
        content: 'Test comment',
      });

      expect(result.content).toBe('Test comment');
      expect(result.task_id).toBe(taskDummy.id);
      expect(result.user_id).toBe(userDummy.id);
    });

    it('negative: should throw NotFoundException when task does not exist', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(taskCommentService.createComment(userDummy.id, randomUUID(), { content: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw ForbiddenException when user has no access to task', async () => {
      const otherTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null };
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(otherTask);

      await expect(taskCommentService.createComment(userDummy.id, otherTask.id, { content: 'Test' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('positive: should allow assignee to create comment', async () => {
      const assignedTask = { ...taskDummy, user_id: randomUUID(), assignee_id: userDummy.id };
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(assignedTask);
      TaskCommentRepositoryMock.orm.save.mockResolvedValueOnce(commentDummy);
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);

      const result = await taskCommentService.createComment(userDummy.id, assignedTask.id, {
        content: 'Test comment',
      });

      expect(result.content).toBe('Test comment');
    });
  });

  describe('getCommentsByTaskId', () => {
    it('positive: should return comments for task', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskCommentRepositoryMock.getCommentsByTaskId.mockResolvedValueOnce([commentDummy]);

      const result = await taskCommentService.getCommentsByTaskId(userDummy.id, taskDummy.id);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Test comment');
    });

    it('positive: should return empty array when no comments', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskCommentRepositoryMock.getCommentsByTaskId.mockResolvedValueOnce([]);

      const result = await taskCommentService.getCommentsByTaskId(userDummy.id, taskDummy.id);

      expect(result).toHaveLength(0);
    });

    it('negative: should throw NotFoundException when task does not exist', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(taskCommentService.getCommentsByTaskId(userDummy.id, randomUUID())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw ForbiddenException when user has no access', async () => {
      const otherTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null };
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(otherTask);

      await expect(taskCommentService.getCommentsByTaskId(userDummy.id, otherTask.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateComment', () => {
    it('positive: should update own comment', async () => {
      const updatedComment = { ...commentDummy, content: 'Updated content' };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      TaskCommentRepositoryMock.update.mockResolvedValueOnce(updatedComment);

      const result = await taskCommentService.updateComment(userDummy.id, taskDummy.id, commentDummy.id, {
        content: 'Updated content',
      });

      expect(result.content).toBe('Updated content');
    });

    it('negative: should throw NotFoundException when comment does not exist', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(null);

      await expect(
        taskCommentService.updateComment(userDummy.id, taskDummy.id, randomUUID(), { content: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw NotFoundException when comment belongs to different task', async () => {
      const commentOnDifferentTask = { ...commentDummy, task_id: randomUUID() };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentOnDifferentTask);

      await expect(
        taskCommentService.updateComment(userDummy.id, taskDummy.id, commentOnDifferentTask.id, { content: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw ForbiddenException when trying to edit others comment', async () => {
      const otherUserComment = { ...commentDummy, user_id: randomUUID() };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(otherUserComment);

      await expect(
        taskCommentService.updateComment(userDummy.id, taskDummy.id, otherUserComment.id, { content: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteComment', () => {
    it('positive: should delete own comment', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      TaskCommentRepositoryMock.deleteComment.mockResolvedValueOnce(undefined);

      await taskCommentService.deleteComment(userDummy.id, taskDummy.id, commentDummy.id);

      expect(TaskCommentRepositoryMock.deleteComment).toHaveBeenCalledWith(commentDummy.id);
    });

    it('negative: should throw NotFoundException when comment does not exist', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(null);

      await expect(taskCommentService.deleteComment(userDummy.id, taskDummy.id, randomUUID())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw ForbiddenException when trying to delete others comment', async () => {
      const otherUserComment = { ...commentDummy, user_id: randomUUID() };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(otherUserComment);

      await expect(taskCommentService.deleteComment(userDummy.id, taskDummy.id, otherUserComment.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
