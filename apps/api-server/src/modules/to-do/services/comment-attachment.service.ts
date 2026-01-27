import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { R2Service } from '@app/r2';
import { CommentAttachmentRepository } from '../repositories/comment-attachment.repository';
import { TaskCommentRepository } from '../repositories/task-comment.repository';
import { ToDoRepository } from '../repositories/to-do.repository';
import { CommentAttachment } from '../entities/comment-attachment.entity';
import { CreateCommentAttachmentDto } from '../dto/create-comment-attachment.dto';
import { CommentAttachmentResponseDto } from '../dto/comment-attachment-response.dto';
import { GenerateUploadCommentAttachmentUrlDto } from '../dto/generate-upload-comment-attachment-url.dto';
import { S3_BUCKET_COMMENT_ATTACHMENTS, MAX_ATTACHMENT_SIZE_BYTES } from '../../../shared/utils/constants';

@Injectable()
export class CommentAttachmentService {
  private readonly logger = new Logger(CommentAttachmentService.name);

  constructor(
    private readonly commentAttachmentRepository: CommentAttachmentRepository,
    private readonly taskCommentRepository: TaskCommentRepository,
    private readonly toDoRepository: ToDoRepository,
    private readonly r2Service: R2Service,
  ) {}

  async generateUploadUrl(
    userId: string,
    commentId: string,
    dto: GenerateUploadCommentAttachmentUrlDto,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    const comment = await this.taskCommentRepository.getCommentById(commentId);

    if (!comment) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }

    const task = await this.toDoRepository.orm.findOne({ where: { id: comment.task_id } });

    if (!task) {
      throw new NotFoundException(`Task with id ${comment.task_id} not found`);
    }

    const hasAccess = this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this comment');
    }

    const fileKey = `${commentId}/${userId}-${Date.now()}-${this.sanitizeFileName(dto.file_name)}`;
    const uploadUrl = await this.r2Service.getPresignedUploadUrl(
      S3_BUCKET_COMMENT_ATTACHMENTS,
      fileKey,
      dto.content_type,
    );

    return { uploadUrl, fileKey };
  }

  async createAttachment(
    userId: string,
    commentId: string,
    dto: CreateCommentAttachmentDto,
  ): Promise<CommentAttachmentResponseDto> {
    const comment = await this.taskCommentRepository.getCommentById(commentId);

    if (!comment) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }

    const task = await this.toDoRepository.orm.findOne({ where: { id: comment.task_id } });

    if (!task) {
      throw new NotFoundException(`Task with id ${comment.task_id} not found`);
    }

    const hasAccess = this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this comment');
    }

    if (!this.isValidFileKey(dto.file_key, commentId, userId)) {
      throw new BadRequestException('Invalid file key format');
    }

    if (dto.file_size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds maximum allowed size of 20 MB');
    }

    let actualFileSize: number;
    try {
      const metadata = await this.r2Service.getObjectMetadata(S3_BUCKET_COMMENT_ATTACHMENTS, dto.file_key);
      actualFileSize = metadata.contentLength;
    } catch (error) {
      throw new BadRequestException('File not found in storage. Please upload the file first.');
    }

    if (actualFileSize > MAX_ATTACHMENT_SIZE_BYTES) {
      try {
        await this.r2Service.deleteObject(S3_BUCKET_COMMENT_ATTACHMENTS, dto.file_key);
      } catch (deleteError) {
        this.logger.error(`Failed to delete oversized file ${dto.file_key}: ${deleteError.message}`);
      }
      throw new BadRequestException('File size exceeds maximum allowed size of 20 MB');
    }

    const attachment = new CommentAttachment(
      {
        comment_id: commentId,
        user_id: userId,
        file_name: dto.file_name,
        file_key: dto.file_key,
        content_type: dto.content_type,
        file_size: actualFileSize,
      },
      { generateId: true },
    );

    const savedAttachment = await this.commentAttachmentRepository.orm.save(attachment);
    const attachmentWithUser = await this.commentAttachmentRepository.getAttachmentById(savedAttachment.id);

    return this.mapAttachmentToResponse(attachmentWithUser);
  }

  async getAttachmentsByCommentId(userId: string, commentId: string): Promise<CommentAttachmentResponseDto[]> {
    const comment = await this.taskCommentRepository.getCommentById(commentId);

    if (!comment) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }

    const task = await this.toDoRepository.orm.findOne({ where: { id: comment.task_id } });

    if (!task) {
      throw new NotFoundException(`Task with id ${comment.task_id} not found`);
    }

    const hasAccess = this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this comment');
    }

    const attachments = await this.commentAttachmentRepository.getAttachmentsByCommentId(commentId);
    return Promise.all(attachments.map((attachment) => this.mapAttachmentToResponse(attachment)));
  }

  async getAttachmentDownloadUrl(
    userId: string,
    commentId: string,
    attachmentId: string,
  ): Promise<{ downloadUrl: string }> {
    const comment = await this.taskCommentRepository.getCommentById(commentId);

    if (!comment) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }

    const task = await this.toDoRepository.orm.findOne({ where: { id: comment.task_id } });

    if (!task) {
      throw new NotFoundException(`Task with id ${comment.task_id} not found`);
    }

    const hasAccess = this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this comment');
    }

    const attachment = await this.commentAttachmentRepository.getAttachmentById(attachmentId);

    if (!attachment || attachment.comment_id !== commentId) {
      throw new NotFoundException(`Attachment with id ${attachmentId} not found`);
    }

    const downloadUrl = await this.r2Service.getPresignedUrl(S3_BUCKET_COMMENT_ATTACHMENTS, attachment.file_key);

    return { downloadUrl };
  }

  async deleteAttachment(userId: string, commentId: string, attachmentId: string): Promise<void> {
    const attachment = await this.commentAttachmentRepository.getAttachmentById(attachmentId);

    if (!attachment || attachment.comment_id !== commentId) {
      throw new NotFoundException(`Attachment with id ${attachmentId} not found`);
    }

    if (attachment.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own attachments');
    }

    await this.commentAttachmentRepository.deleteAttachment(attachmentId);

    try {
      await this.r2Service.deleteObject(S3_BUCKET_COMMENT_ATTACHMENTS, attachment.file_key);
    } catch (error) {
      this.logger.error(`Failed to delete R2 object for attachment ${attachmentId}: ${error.message}`);
    }
  }

  private userHasAccessToTask(userId: string, task: { user_id?: string; assignee_id?: string }): boolean {
    return task.user_id === userId || task.assignee_id === userId;
  }

  private async mapAttachmentToResponse(attachment: CommentAttachment): Promise<CommentAttachmentResponseDto> {
    const downloadUrl = await this.r2Service.getPresignedUrl(S3_BUCKET_COMMENT_ATTACHMENTS, attachment.file_key);

    return {
      id: attachment.id,
      comment_id: attachment.comment_id,
      user_id: attachment.user_id,
      file_name: attachment.file_name,
      file_key: attachment.file_key,
      content_type: attachment.content_type,
      file_size: Number(attachment.file_size),
      download_url: downloadUrl,
      user: attachment.user
        ? {
            id: attachment.user.id,
          }
        : undefined,
      created_at: attachment.created_at,
      updated_at: attachment.updated_at,
    };
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  private isValidFileKey(fileKey: string, commentId: string, userId: string): boolean {
    const expectedPrefix = `${commentId}/${userId}-`;
    return fileKey.startsWith(expectedPrefix);
  }
}
