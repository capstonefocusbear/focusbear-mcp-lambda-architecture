import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { randomUUID } from 'crypto';
import { TaskCommentReactionService } from './task-comment-reaction.service';
import { TaskCommentReactionRepository } from '../repositories/task-comment-reaction.repository';
import { TaskCommentRepository } from '../repositories/task-comment.repository';
import { ToDoRepository } from '../repositories/to-do.repository';
import { ProjectMemberRepository } from '../../project/repositories/project-member.repository';
import { ProjectMemberInvitationStatus } from '../../project/domain/project-member-invitation-status.enum';

const ReactionRepositoryMock = {
  orm: {
    save: jest.fn(),
    findOne: jest.fn(),
  },
  getReactionsByCommentId: jest.fn(),
  getReactionByCommentUserEmoji: jest.fn(),
  deleteReaction: jest.fn(),
};

const TaskCommentRepositoryMock = {
  getCommentById: jest.fn(),
};

const ToDoRepositoryMock = {
  orm: {
    findOne: jest.fn(),
  },
};

const ProjectMemberRepositoryMock = {
  getMemberByProjectAndUser: jest.fn(),
};

describe('TaskCommentReactionService', () => {
  let service: TaskCommentReactionService;

  const userDummy = { id: randomUUID(), username: 'testuser' };
  const taskDummy = { id: randomUUID(), user_id: userDummy.id, assignee_id: null, project_id: null };
  const commentDummy = { id: randomUUID(), task_id: taskDummy.id, user_id: userDummy.id };
  const reactionDummy = {
    id: randomUUID(),
    comment_id: commentDummy.id,
    user_id: userDummy.id,
    emoji: '👍',
    user: userDummy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TaskCommentReactionService,
        TaskCommentReactionRepository,
        TaskCommentRepository,
        ToDoRepository,
        ProjectMemberRepository,
      ],
    })
      .overrideProvider(TaskCommentReactionRepository)
      .useValue(ReactionRepositoryMock)
      .overrideProvider(TaskCommentRepository)
      .useValue(TaskCommentRepositoryMock)
      .overrideProvider(ToDoRepository)
      .useValue(ToDoRepositoryMock)
      .overrideProvider(ProjectMemberRepository)
      .useValue(ProjectMemberRepositoryMock)
      .compile();

    service = moduleRef.get<TaskCommentReactionService>(TaskCommentReactionService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addReaction', () => {
    it('positive: should add a reaction successfully', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      ReactionRepositoryMock.getReactionByCommentUserEmoji.mockResolvedValueOnce(null);
      ReactionRepositoryMock.orm.save.mockResolvedValueOnce(reactionDummy);
      ReactionRepositoryMock.orm.findOne.mockResolvedValueOnce(reactionDummy);

      const result = await service.addReaction(userDummy.id, taskDummy.id, commentDummy.id, { emoji: '👍' });

      expect(result.emoji).toBe('👍');
      expect(result.comment_id).toBe(commentDummy.id);
      expect(result.user_id).toBe(userDummy.id);
    });

    it('negative: should throw NotFoundException when comment not found', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(null);

      await expect(service.addReaction(userDummy.id, taskDummy.id, randomUUID(), { emoji: '👍' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw NotFoundException when comment belongs to different task', async () => {
      const commentOnOtherTask = { ...commentDummy, task_id: randomUUID() };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentOnOtherTask);

      await expect(service.addReaction(userDummy.id, taskDummy.id, commentOnOtherTask.id, { emoji: '👍' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw NotFoundException when task not found', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(service.addReaction(userDummy.id, taskDummy.id, commentDummy.id, { emoji: '👍' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw ForbiddenException when user has no access', async () => {
      const otherTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null, project_id: null };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce({ ...commentDummy, task_id: otherTask.id });
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(otherTask);

      await expect(service.addReaction(userDummy.id, otherTask.id, commentDummy.id, { emoji: '👍' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('negative: should throw ConflictException when reaction already exists (pre-check)', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      ReactionRepositoryMock.getReactionByCommentUserEmoji.mockResolvedValueOnce(reactionDummy);

      await expect(service.addReaction(userDummy.id, taskDummy.id, commentDummy.id, { emoji: '👍' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('negative: should throw ConflictException on race condition (DB unique violation)', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      ReactionRepositoryMock.getReactionByCommentUserEmoji.mockResolvedValueOnce(null);

      const driverError = { code: '23505', constraint: 'UQ_task_comment_reactions_comment_user_emoji' };
      const dbError = new QueryFailedError('INSERT', [], driverError as any);
      ReactionRepositoryMock.orm.save.mockRejectedValueOnce(dbError);

      await expect(service.addReaction(userDummy.id, taskDummy.id, commentDummy.id, { emoji: '👍' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('positive: should allow assignee to add reaction', async () => {
      const assignedTask = { ...taskDummy, user_id: randomUUID(), assignee_id: userDummy.id };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce({ ...commentDummy, task_id: assignedTask.id });
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(assignedTask);
      ReactionRepositoryMock.getReactionByCommentUserEmoji.mockResolvedValueOnce(null);
      ReactionRepositoryMock.orm.save.mockResolvedValueOnce(reactionDummy);
      ReactionRepositoryMock.orm.findOne.mockResolvedValueOnce(reactionDummy);

      const result = await service.addReaction(userDummy.id, assignedTask.id, commentDummy.id, { emoji: '👍' });
      expect(result.emoji).toBe('👍');
    });

    it('positive: should allow accepted project member to add reaction', async () => {
      const projectId = randomUUID();
      const projectTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null, project_id: projectId };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce({ ...commentDummy, task_id: projectTask.id });
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(projectTask);
      ProjectMemberRepositoryMock.getMemberByProjectAndUser.mockResolvedValueOnce({
        invitation_status: ProjectMemberInvitationStatus.ACCEPTED,
      });
      ReactionRepositoryMock.getReactionByCommentUserEmoji.mockResolvedValueOnce(null);
      ReactionRepositoryMock.orm.save.mockResolvedValueOnce(reactionDummy);
      ReactionRepositoryMock.orm.findOne.mockResolvedValueOnce(reactionDummy);

      const result = await service.addReaction(userDummy.id, projectTask.id, commentDummy.id, { emoji: '👍' });
      expect(result.emoji).toBe('👍');
    });
  });

  describe('getReactionsByCommentId', () => {
    it('positive: should return reactions for a comment', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      ReactionRepositoryMock.getReactionsByCommentId.mockResolvedValueOnce([reactionDummy]);

      const result = await service.getReactionsByCommentId(userDummy.id, taskDummy.id, commentDummy.id);

      expect(result).toHaveLength(1);
      expect(result[0].emoji).toBe('👍');
    });

    it('positive: should return empty array when no reactions', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      ReactionRepositoryMock.getReactionsByCommentId.mockResolvedValueOnce([]);

      const result = await service.getReactionsByCommentId(userDummy.id, taskDummy.id, commentDummy.id);

      expect(result).toHaveLength(0);
    });

    it('negative: should throw NotFoundException when comment not found', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(null);

      await expect(service.getReactionsByCommentId(userDummy.id, taskDummy.id, randomUUID())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw NotFoundException when task not found', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(service.getReactionsByCommentId(userDummy.id, taskDummy.id, commentDummy.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw ForbiddenException when user has no access', async () => {
      const otherTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null, project_id: null };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce({ ...commentDummy, task_id: otherTask.id });
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(otherTask);

      await expect(service.getReactionsByCommentId(userDummy.id, otherTask.id, commentDummy.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deleteReaction', () => {
    it('positive: should delete own reaction successfully', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      ReactionRepositoryMock.getReactionByCommentUserEmoji.mockResolvedValueOnce(reactionDummy);
      ReactionRepositoryMock.deleteReaction.mockResolvedValueOnce({ affected: 1 });

      await service.deleteReaction(userDummy.id, taskDummy.id, commentDummy.id, '👍');

      expect(ReactionRepositoryMock.deleteReaction).toHaveBeenCalledWith(reactionDummy.id);
    });

    it('negative: should throw NotFoundException when reaction is deleted concurrently', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      ReactionRepositoryMock.getReactionByCommentUserEmoji.mockResolvedValueOnce(reactionDummy);
      ReactionRepositoryMock.deleteReaction.mockResolvedValueOnce({ affected: 0 });

      await expect(service.deleteReaction(userDummy.id, taskDummy.id, commentDummy.id, '👍')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw NotFoundException when comment not found', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(null);

      await expect(service.deleteReaction(userDummy.id, taskDummy.id, randomUUID(), '👍')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw NotFoundException when task not found', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(service.deleteReaction(userDummy.id, taskDummy.id, commentDummy.id, '👍')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw ForbiddenException when user has no access to task', async () => {
      const otherTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null, project_id: null };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce({ ...commentDummy, task_id: otherTask.id });
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(otherTask);

      await expect(service.deleteReaction(userDummy.id, otherTask.id, commentDummy.id, '👍')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('negative: should throw NotFoundException when reaction not found', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      ReactionRepositoryMock.getReactionByCommentUserEmoji.mockResolvedValueOnce(null);

      await expect(service.deleteReaction(userDummy.id, taskDummy.id, commentDummy.id, '👍')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
