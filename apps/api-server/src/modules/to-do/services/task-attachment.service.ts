import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { R2Service } from '@app/r2';
import { TaskAttachmentRepository } from '../repositories/task-attachment.repository';
import { ToDoRepository } from '../repositories/to-do.repository';
import { ProjectMemberRepository } from '../../project/repositories/project-member.repository';
import { ProjectMemberInvitationStatus } from '../../project/domain/project-member-invitation-status.enum';
import { TaskAttachment } from '../entities/task-attachment.entity';
import { CreateTaskAttachmentDto } from '../dto/create-task-attachment.dto';
import { TaskAttachmentResponseDto } from '../dto/task-attachment-response.dto';
import { GenerateUploadAttachmentUrlDto } from '../dto/generate-upload-attachment-url.dto';
import {
  S3_BUCKET_TASK_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_TASK_ATTACHMENTS,
} from '../../../shared/utils/constants';

@Injectable()
export class TaskAttachmentService {
  private readonly logger = new Logger(TaskAttachmentService.name);

  constructor(
    private readonly taskAttachmentRepository: TaskAttachmentRepository,
    private readonly toDoRepository: ToDoRepository,
    private readonly r2Service: R2Service,
    private readonly projectMemberRepository: ProjectMemberRepository,
  ) {}

  async generateUploadUrl(
    userId: string,
    taskId: string,
    dto: GenerateUploadAttachmentUrlDto,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    const task = await this.toDoRepository.orm.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    const hasAccess = await this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    const fileKey = `${taskId}/${userId}-${Date.now()}-${this.sanitizeFileName(dto.file_name)}`;
    const uploadUrl = await this.r2Service.getPresignedUploadUrl(S3_BUCKET_TASK_ATTACHMENTS, fileKey, dto.content_type);

    return { uploadUrl, fileKey };
  }

  async createAttachment(
    userId: string,
    taskId: string,
    dto: CreateTaskAttachmentDto,
  ): Promise<TaskAttachmentResponseDto> {
    const task = await this.toDoRepository.orm.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    const hasAccess = await this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    if (!this.isValidFileKey(dto.file_key, taskId, userId)) {
      throw new BadRequestException('Invalid file key format');
    }

    if (dto.file_size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds maximum allowed size of 20 MB');
    }

    const existingAttachments = await this.taskAttachmentRepository.getAttachmentsByTaskId(taskId);
    if (existingAttachments.length >= MAX_TASK_ATTACHMENTS) {
      throw new BadRequestException(`Maximum of ${MAX_TASK_ATTACHMENTS} attachments per task exceeded`);
    }

    let actualFileSize: number;
    try {
      const metadata = await this.r2Service.getObjectMetadata(S3_BUCKET_TASK_ATTACHMENTS, dto.file_key);
      actualFileSize = metadata.contentLength;
    } catch (_error) {
      throw new BadRequestException('File not found in storage. Please upload the file first.');
    }

    if (actualFileSize > MAX_ATTACHMENT_SIZE_BYTES) {
      try {
        await this.r2Service.deleteObject(S3_BUCKET_TASK_ATTACHMENTS, dto.file_key);
      } catch (deleteError) {
        this.logger.error(`Failed to delete oversized file ${dto.file_key}: ${deleteError.message}`);
      }
      throw new BadRequestException('File size exceeds maximum allowed size of 20 MB');
    }

    const attachment = new TaskAttachment(
      {
        task_id: taskId,
        user_id: userId,
        file_name: dto.file_name,
        file_key: dto.file_key,
        content_type: dto.content_type,
        file_size: actualFileSize,
      },
      { generateId: true },
    );

    const savedAttachment = await this.taskAttachmentRepository.orm.save(attachment);
    const attachmentWithUser = await this.taskAttachmentRepository.getAttachmentById(savedAttachment.id);

    return this.mapAttachmentToResponse(attachmentWithUser);
  }

  async getAttachmentsByTaskId(userId: string, taskId: string): Promise<TaskAttachmentResponseDto[]> {
    const task = await this.toDoRepository.orm.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    const hasAccess = await this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    const attachments = await this.taskAttachmentRepository.getAttachmentsByTaskId(taskId);
    return Promise.all(attachments.map((attachment) => this.mapAttachmentToResponse(attachment)));
  }

  async getAttachmentDownloadUrl(
    userId: string,
    taskId: string,
    attachmentId: string,
  ): Promise<{ downloadUrl: string }> {
    const task = await this.toDoRepository.orm.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    const hasAccess = await this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    const attachment = await this.taskAttachmentRepository.getAttachmentById(attachmentId);

    if (!attachment || attachment.task_id !== taskId) {
      throw new NotFoundException(`Attachment with id ${attachmentId} not found`);
    }

    const downloadUrl = await this.r2Service.getPresignedUrl(S3_BUCKET_TASK_ATTACHMENTS, attachment.file_key);

    return { downloadUrl };
  }

  async deleteAttachment(userId: string, taskId: string, attachmentId: string): Promise<void> {
    const attachment = await this.taskAttachmentRepository.getAttachmentById(attachmentId);

    if (!attachment || attachment.task_id !== taskId) {
      throw new NotFoundException(`Attachment with id ${attachmentId} not found`);
    }

    if (attachment.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own attachments');
    }

    try {
      await this.r2Service.deleteObject(S3_BUCKET_TASK_ATTACHMENTS, attachment.file_key);
    } catch (error) {
      this.logger.error(
        `Failed to delete R2 object for attachment ${attachmentId} (bucket=${S3_BUCKET_TASK_ATTACHMENTS}, key=${attachment.file_key}): ${error.message}`,
      );
    }

    await this.taskAttachmentRepository.deleteAttachment(attachmentId);
  }

  private async userHasAccessToTask(
    userId: string,
    task: { user_id?: string; assignee_id?: string; project_id?: string },
  ): Promise<boolean> {
    if (task.user_id === userId || task.assignee_id === userId) {
      return true;
    }

    if (task.project_id) {
      const member = await this.projectMemberRepository.getMemberByProjectAndUser(task.project_id, userId);
      return member?.invitation_status === ProjectMemberInvitationStatus.ACCEPTED;
    }

    return false;
  }

  private async mapAttachmentToResponse(attachment: TaskAttachment): Promise<TaskAttachmentResponseDto> {
    const downloadUrl = await this.r2Service.getPresignedUrl(S3_BUCKET_TASK_ATTACHMENTS, attachment.file_key);

    return {
      id: attachment.id,
      task_id: attachment.task_id,
      user_id: attachment.user_id,
      file_name: attachment.file_name,
      file_key: attachment.file_key,
      content_type: attachment.content_type,
      file_size: Number(attachment.file_size),
      download_url: downloadUrl,
      user: attachment.user
        ? {
            id: attachment.user.id,
            username: attachment.user.username,
          }
        : undefined,
      created_at: attachment.created_at,
      updated_at: attachment.updated_at,
    };
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  private isValidFileKey(fileKey: string, taskId: string, userId: string): boolean {
    const expectedPrefix = `${taskId}/${userId}-`;
    return fileKey.startsWith(expectedPrefix);
  }
}
