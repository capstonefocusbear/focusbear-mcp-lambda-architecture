import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { R2Service } from '@app/r2';
import { CommentAttachmentService } from './comment-attachment.service';
import { CommentAttachmentRepository } from '../repositories/comment-attachment.repository';
import { TaskCommentRepository } from '../repositories/task-comment.repository';
import { ToDoRepository } from '../repositories/to-do.repository';

const CommentAttachmentRepositoryMock = {
  orm: {
    save: jest.fn(),
    delete: jest.fn(),
  },
  getAttachmentsByCommentId: jest.fn(),
  getAttachmentById: jest.fn(),
  deleteAttachment: jest.fn(),
};

const TaskCommentRepositoryMock = {
  getCommentById: jest.fn(),
};

const ToDoRepositoryMock = {
  orm: {
    findOne: jest.fn(),
  },
};

const R2ServiceMock = {
  getPresignedUploadUrl: jest.fn(),
  getPresignedUrl: jest.fn(),
};

describe('CommentAttachmentService', () => {
  let commentAttachmentService: CommentAttachmentService;

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
  };

  const attachmentDummy = {
    id: randomUUID(),
    comment_id: commentDummy.id,
    user_id: userDummy.id,
    file_name: 'test-file.pdf',
    file_key: `${commentDummy.id}/${userDummy.id}-123456-test-file.pdf`,
    content_type: 'application/pdf',
    file_size: 1024,
    user: userDummy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommentAttachmentService,
        CommentAttachmentRepository,
        TaskCommentRepository,
        ToDoRepository,
        R2Service,
      ],
    })
      .overrideProvider(CommentAttachmentRepository)
      .useValue(CommentAttachmentRepositoryMock)
      .overrideProvider(TaskCommentRepository)
      .useValue(TaskCommentRepositoryMock)
      .overrideProvider(ToDoRepository)
      .useValue(ToDoRepositoryMock)
      .overrideProvider(R2Service)
      .useValue(R2ServiceMock)
      .compile();

    commentAttachmentService = moduleRef.get<CommentAttachmentService>(CommentAttachmentService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(commentAttachmentService).toBeDefined();
  });

  describe('generateUploadUrl', () => {
    it('positive: should generate upload URL for task owner', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      R2ServiceMock.getPresignedUploadUrl.mockResolvedValueOnce('https://r2.example.com/upload');

      const result = await commentAttachmentService.generateUploadUrl(userDummy.id, commentDummy.id, {
        file_name: 'test-file.pdf',
        content_type: 'application/pdf',
      });

      expect(result.uploadUrl).toBe('https://r2.example.com/upload');
      expect(result.fileKey).toContain(commentDummy.id);
    });

    it('negative: should throw NotFoundException when comment does not exist', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(null);

      await expect(
        commentAttachmentService.generateUploadUrl(userDummy.id, randomUUID(), {
          file_name: 'test.pdf',
          content_type: 'application/pdf',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw ForbiddenException when user has no access to task', async () => {
      const otherTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(otherTask);

      await expect(
        commentAttachmentService.generateUploadUrl(userDummy.id, commentDummy.id, {
          file_name: 'test.pdf',
          content_type: 'application/pdf',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('positive: should allow assignee to generate upload URL', async () => {
      const assignedTask = { ...taskDummy, user_id: randomUUID(), assignee_id: userDummy.id };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(assignedTask);
      R2ServiceMock.getPresignedUploadUrl.mockResolvedValueOnce('https://r2.example.com/upload');

      const result = await commentAttachmentService.generateUploadUrl(userDummy.id, commentDummy.id, {
        file_name: 'test-file.pdf',
        content_type: 'application/pdf',
      });

      expect(result.uploadUrl).toBe('https://r2.example.com/upload');
    });
  });

  describe('createAttachment', () => {
    it('positive: should create a new attachment', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      CommentAttachmentRepositoryMock.orm.save.mockResolvedValueOnce(attachmentDummy);
      CommentAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(attachmentDummy);
      R2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://r2.example.com/download');

      const result = await commentAttachmentService.createAttachment(userDummy.id, commentDummy.id, {
        file_name: 'test-file.pdf',
        file_key: attachmentDummy.file_key,
        content_type: 'application/pdf',
        file_size: 1024,
      });

      expect(result.file_name).toBe('test-file.pdf');
      expect(result.comment_id).toBe(commentDummy.id);
      expect(result.user_id).toBe(userDummy.id);
    });

    it('negative: should throw NotFoundException when comment does not exist', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(null);

      await expect(
        commentAttachmentService.createAttachment(userDummy.id, randomUUID(), {
          file_name: 'test.pdf',
          file_key: 'key',
          content_type: 'application/pdf',
          file_size: 1024,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw ForbiddenException when user has no access to task', async () => {
      const otherTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(otherTask);

      await expect(
        commentAttachmentService.createAttachment(userDummy.id, commentDummy.id, {
          file_name: 'test.pdf',
          file_key: 'key',
          content_type: 'application/pdf',
          file_size: 1024,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('negative: should throw BadRequestException when file_key does not match expected format', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);

      await expect(
        commentAttachmentService.createAttachment(userDummy.id, commentDummy.id, {
          file_name: 'test.pdf',
          file_key: 'malicious-key-pointing-to-other-file',
          content_type: 'application/pdf',
          file_size: 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('negative: should throw BadRequestException when file_key has wrong commentId', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      const wrongCommentId = randomUUID();

      await expect(
        commentAttachmentService.createAttachment(userDummy.id, commentDummy.id, {
          file_name: 'test.pdf',
          file_key: `${wrongCommentId}/${userDummy.id}-123456-test.pdf`,
          content_type: 'application/pdf',
          file_size: 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('negative: should throw BadRequestException when file_key has wrong userId', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      const wrongUserId = randomUUID();

      await expect(
        commentAttachmentService.createAttachment(userDummy.id, commentDummy.id, {
          file_name: 'test.pdf',
          file_key: `${commentDummy.id}/${wrongUserId}-123456-test.pdf`,
          content_type: 'application/pdf',
          file_size: 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAttachmentsByCommentId', () => {
    it('positive: should return attachments for comment', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      CommentAttachmentRepositoryMock.getAttachmentsByCommentId.mockResolvedValueOnce([attachmentDummy]);
      R2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://r2.example.com/download');

      const result = await commentAttachmentService.getAttachmentsByCommentId(userDummy.id, commentDummy.id);

      expect(result).toHaveLength(1);
      expect(result[0].file_name).toBe('test-file.pdf');
    });

    it('positive: should return empty array when no attachments', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      CommentAttachmentRepositoryMock.getAttachmentsByCommentId.mockResolvedValueOnce([]);

      const result = await commentAttachmentService.getAttachmentsByCommentId(userDummy.id, commentDummy.id);

      expect(result).toHaveLength(0);
    });

    it('negative: should throw NotFoundException when comment does not exist', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(null);

      await expect(commentAttachmentService.getAttachmentsByCommentId(userDummy.id, randomUUID())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw ForbiddenException when user has no access', async () => {
      const otherTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(otherTask);

      await expect(commentAttachmentService.getAttachmentsByCommentId(userDummy.id, commentDummy.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getAttachmentDownloadUrl', () => {
    it('positive: should return download URL for attachment', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      CommentAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(attachmentDummy);
      R2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://r2.example.com/download');

      const result = await commentAttachmentService.getAttachmentDownloadUrl(
        userDummy.id,
        commentDummy.id,
        attachmentDummy.id,
      );

      expect(result.downloadUrl).toBe('https://r2.example.com/download');
    });

    it('negative: should throw NotFoundException when comment does not exist', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(null);

      await expect(
        commentAttachmentService.getAttachmentDownloadUrl(userDummy.id, randomUUID(), attachmentDummy.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw NotFoundException when attachment does not exist', async () => {
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      CommentAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(null);

      await expect(
        commentAttachmentService.getAttachmentDownloadUrl(userDummy.id, commentDummy.id, randomUUID()),
      ).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw NotFoundException when attachment belongs to different comment', async () => {
      const attachmentOnDifferentComment = { ...attachmentDummy, comment_id: randomUUID() };
      TaskCommentRepositoryMock.getCommentById.mockResolvedValueOnce(commentDummy);
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      CommentAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(attachmentOnDifferentComment);

      await expect(
        commentAttachmentService.getAttachmentDownloadUrl(
          userDummy.id,
          commentDummy.id,
          attachmentOnDifferentComment.id,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAttachment', () => {
    it('positive: should delete own attachment', async () => {
      CommentAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(attachmentDummy);
      CommentAttachmentRepositoryMock.deleteAttachment.mockResolvedValueOnce(undefined);

      await commentAttachmentService.deleteAttachment(userDummy.id, commentDummy.id, attachmentDummy.id);

      expect(CommentAttachmentRepositoryMock.deleteAttachment).toHaveBeenCalledWith(attachmentDummy.id);
    });

    it('negative: should throw NotFoundException when attachment does not exist', async () => {
      CommentAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(null);

      await expect(
        commentAttachmentService.deleteAttachment(userDummy.id, commentDummy.id, randomUUID()),
      ).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw NotFoundException when attachment belongs to different comment', async () => {
      const attachmentOnDifferentComment = { ...attachmentDummy, comment_id: randomUUID() };
      CommentAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(attachmentOnDifferentComment);

      await expect(
        commentAttachmentService.deleteAttachment(userDummy.id, commentDummy.id, attachmentOnDifferentComment.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw ForbiddenException when trying to delete others attachment', async () => {
      const otherUserAttachment = { ...attachmentDummy, user_id: randomUUID() };
      CommentAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(otherUserAttachment);

      await expect(
        commentAttachmentService.deleteAttachment(userDummy.id, commentDummy.id, otherUserAttachment.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
