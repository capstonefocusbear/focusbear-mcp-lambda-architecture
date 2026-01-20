import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { R2Service } from '@app/r2';
import { TaskAttachmentService } from './task-attachment.service';
import { TaskAttachmentRepository } from '../repositories/task-attachment.repository';
import { ToDoRepository } from '../repositories/to-do.repository';

const TaskAttachmentRepositoryMock = {
  orm: {
    save: jest.fn(),
    delete: jest.fn(),
  },
  getAttachmentsByTaskId: jest.fn(),
  getAttachmentById: jest.fn(),
  deleteAttachment: jest.fn(),
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

describe('TaskAttachmentService', () => {
  let taskAttachmentService: TaskAttachmentService;

  const userDummy = {
    id: randomUUID(),
  };

  const taskDummy = {
    id: randomUUID(),
    user_id: userDummy.id,
    title: 'Test Task',
  };

  const attachmentDummy = {
    id: randomUUID(),
    task_id: taskDummy.id,
    user_id: userDummy.id,
    file_name: 'test-file.pdf',
    file_key: `${taskDummy.id}/${userDummy.id}-123456-test-file.pdf`,
    content_type: 'application/pdf',
    file_size: 1024,
    user: userDummy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [TaskAttachmentService, TaskAttachmentRepository, ToDoRepository, R2Service],
    })
      .overrideProvider(TaskAttachmentRepository)
      .useValue(TaskAttachmentRepositoryMock)
      .overrideProvider(ToDoRepository)
      .useValue(ToDoRepositoryMock)
      .overrideProvider(R2Service)
      .useValue(R2ServiceMock)
      .compile();

    taskAttachmentService = moduleRef.get<TaskAttachmentService>(TaskAttachmentService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(taskAttachmentService).toBeDefined();
  });

  describe('generateUploadUrl', () => {
    it('positive: should generate upload URL for task owner', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      R2ServiceMock.getPresignedUploadUrl.mockResolvedValueOnce('https://r2.example.com/upload');

      const result = await taskAttachmentService.generateUploadUrl(userDummy.id, taskDummy.id, {
        file_name: 'test-file.pdf',
        content_type: 'application/pdf',
      });

      expect(result.uploadUrl).toBe('https://r2.example.com/upload');
      expect(result.fileKey).toContain(taskDummy.id);
    });

    it('negative: should throw NotFoundException when task does not exist', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(
        taskAttachmentService.generateUploadUrl(userDummy.id, randomUUID(), {
          file_name: 'test.pdf',
          content_type: 'application/pdf',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw ForbiddenException when user has no access to task', async () => {
      const otherTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null };
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(otherTask);

      await expect(
        taskAttachmentService.generateUploadUrl(userDummy.id, otherTask.id, {
          file_name: 'test.pdf',
          content_type: 'application/pdf',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('positive: should allow assignee to generate upload URL', async () => {
      const assignedTask = { ...taskDummy, user_id: randomUUID(), assignee_id: userDummy.id };
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(assignedTask);
      R2ServiceMock.getPresignedUploadUrl.mockResolvedValueOnce('https://r2.example.com/upload');

      const result = await taskAttachmentService.generateUploadUrl(userDummy.id, assignedTask.id, {
        file_name: 'test-file.pdf',
        content_type: 'application/pdf',
      });

      expect(result.uploadUrl).toBe('https://r2.example.com/upload');
    });
  });

  describe('createAttachment', () => {
    it('positive: should create a new attachment', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskAttachmentRepositoryMock.orm.save.mockResolvedValueOnce(attachmentDummy);
      TaskAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(attachmentDummy);
      R2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://r2.example.com/download');

      const result = await taskAttachmentService.createAttachment(userDummy.id, taskDummy.id, {
        file_name: 'test-file.pdf',
        file_key: attachmentDummy.file_key,
        content_type: 'application/pdf',
        file_size: 1024,
      });

      expect(result.file_name).toBe('test-file.pdf');
      expect(result.task_id).toBe(taskDummy.id);
      expect(result.user_id).toBe(userDummy.id);
    });

    it('negative: should throw NotFoundException when task does not exist', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(
        taskAttachmentService.createAttachment(userDummy.id, randomUUID(), {
          file_name: 'test.pdf',
          file_key: 'key',
          content_type: 'application/pdf',
          file_size: 1024,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw ForbiddenException when user has no access to task', async () => {
      const otherTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null };
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(otherTask);

      await expect(
        taskAttachmentService.createAttachment(userDummy.id, otherTask.id, {
          file_name: 'test.pdf',
          file_key: 'key',
          content_type: 'application/pdf',
          file_size: 1024,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('negative: should throw BadRequestException when file_key does not match expected format', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);

      await expect(
        taskAttachmentService.createAttachment(userDummy.id, taskDummy.id, {
          file_name: 'test.pdf',
          file_key: 'malicious-key-pointing-to-other-file',
          content_type: 'application/pdf',
          file_size: 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('negative: should throw BadRequestException when file_key has wrong taskId', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      const wrongTaskId = randomUUID();

      await expect(
        taskAttachmentService.createAttachment(userDummy.id, taskDummy.id, {
          file_name: 'test.pdf',
          file_key: `${wrongTaskId}/${userDummy.id}-123456-test.pdf`,
          content_type: 'application/pdf',
          file_size: 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('negative: should throw BadRequestException when file_key has wrong userId', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      const wrongUserId = randomUUID();

      await expect(
        taskAttachmentService.createAttachment(userDummy.id, taskDummy.id, {
          file_name: 'test.pdf',
          file_key: `${taskDummy.id}/${wrongUserId}-123456-test.pdf`,
          content_type: 'application/pdf',
          file_size: 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('negative: should throw BadRequestException when file size exceeds 20 MB limit', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      const oversizedFileSize = 21 * 1024 * 1024; // 21 MB

      await expect(
        taskAttachmentService.createAttachment(userDummy.id, taskDummy.id, {
          file_name: 'large-file.pdf',
          file_key: `${taskDummy.id}/${userDummy.id}-123456-large-file.pdf`,
          content_type: 'application/pdf',
          file_size: oversizedFileSize,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAttachmentsByTaskId', () => {
    it('positive: should return attachments for task', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskAttachmentRepositoryMock.getAttachmentsByTaskId.mockResolvedValueOnce([attachmentDummy]);
      R2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://r2.example.com/download');

      const result = await taskAttachmentService.getAttachmentsByTaskId(userDummy.id, taskDummy.id);

      expect(result).toHaveLength(1);
      expect(result[0].file_name).toBe('test-file.pdf');
    });

    it('positive: should return empty array when no attachments', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskAttachmentRepositoryMock.getAttachmentsByTaskId.mockResolvedValueOnce([]);

      const result = await taskAttachmentService.getAttachmentsByTaskId(userDummy.id, taskDummy.id);

      expect(result).toHaveLength(0);
    });

    it('negative: should throw NotFoundException when task does not exist', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(taskAttachmentService.getAttachmentsByTaskId(userDummy.id, randomUUID())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw ForbiddenException when user has no access', async () => {
      const otherTask = { ...taskDummy, user_id: randomUUID(), assignee_id: null };
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(otherTask);

      await expect(taskAttachmentService.getAttachmentsByTaskId(userDummy.id, otherTask.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getAttachmentDownloadUrl', () => {
    it('positive: should return download URL for attachment', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(attachmentDummy);
      R2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://r2.example.com/download');

      const result = await taskAttachmentService.getAttachmentDownloadUrl(
        userDummy.id,
        taskDummy.id,
        attachmentDummy.id,
      );

      expect(result.downloadUrl).toBe('https://r2.example.com/download');
    });

    it('negative: should throw NotFoundException when task does not exist', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(
        taskAttachmentService.getAttachmentDownloadUrl(userDummy.id, randomUUID(), attachmentDummy.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw NotFoundException when attachment does not exist', async () => {
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(null);

      await expect(
        taskAttachmentService.getAttachmentDownloadUrl(userDummy.id, taskDummy.id, randomUUID()),
      ).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw NotFoundException when attachment belongs to different task', async () => {
      const attachmentOnDifferentTask = { ...attachmentDummy, task_id: randomUUID() };
      ToDoRepositoryMock.orm.findOne.mockResolvedValueOnce(taskDummy);
      TaskAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(attachmentOnDifferentTask);

      await expect(
        taskAttachmentService.getAttachmentDownloadUrl(userDummy.id, taskDummy.id, attachmentOnDifferentTask.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAttachment', () => {
    it('positive: should delete own attachment', async () => {
      TaskAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(attachmentDummy);
      TaskAttachmentRepositoryMock.deleteAttachment.mockResolvedValueOnce(undefined);

      await taskAttachmentService.deleteAttachment(userDummy.id, taskDummy.id, attachmentDummy.id);

      expect(TaskAttachmentRepositoryMock.deleteAttachment).toHaveBeenCalledWith(attachmentDummy.id);
    });

    it('negative: should throw NotFoundException when attachment does not exist', async () => {
      TaskAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(null);

      await expect(taskAttachmentService.deleteAttachment(userDummy.id, taskDummy.id, randomUUID())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw NotFoundException when attachment belongs to different task', async () => {
      const attachmentOnDifferentTask = { ...attachmentDummy, task_id: randomUUID() };
      TaskAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(attachmentOnDifferentTask);

      await expect(
        taskAttachmentService.deleteAttachment(userDummy.id, taskDummy.id, attachmentOnDifferentTask.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw ForbiddenException when trying to delete others attachment', async () => {
      const otherUserAttachment = { ...attachmentDummy, user_id: randomUUID() };
      TaskAttachmentRepositoryMock.getAttachmentById.mockResolvedValueOnce(otherUserAttachment);

      await expect(
        taskAttachmentService.deleteAttachment(userDummy.id, taskDummy.id, otherUserAttachment.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
