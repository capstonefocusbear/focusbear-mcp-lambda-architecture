import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { CommentAttachmentService } from '../services/comment-attachment.service';
import { CreateCommentAttachmentDto } from '../dto/create-comment-attachment.dto';
import { CommentAttachmentParamsDto } from '../dto/comment-attachment-params.dto';
import { CommentAttachmentByIdParamsDto } from '../dto/comment-attachment-by-id-params.dto';
import { CommentAttachmentResponseDto } from '../dto/comment-attachment-response.dto';
import { GenerateUploadCommentAttachmentUrlDto } from '../dto/generate-upload-comment-attachment-url.dto';

@Controller('to-do/:task_id/comments/:comment_id/attachments')
@ApiTags('comment-attachments')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class CommentAttachmentController {
  constructor(private readonly commentAttachmentService: CommentAttachmentService) {}

  @Post('generate-upload-url')
  async generateUploadUrl(
    @Param() params: CommentAttachmentParamsDto,
    @Body() dto: GenerateUploadCommentAttachmentUrlDto,
    @AuthContext() { user }: Passport,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    return this.commentAttachmentService.generateUploadUrl(user.id, params.task_id, params.comment_id, dto);
  }

  @Post()
  async createAttachment(
    @Param() params: CommentAttachmentParamsDto,
    @Body() dto: CreateCommentAttachmentDto,
    @AuthContext() { user }: Passport,
  ): Promise<CommentAttachmentResponseDto> {
    return this.commentAttachmentService.createAttachment(user.id, params.task_id, params.comment_id, dto);
  }

  @Get()
  async getAttachments(
    @Param() params: CommentAttachmentParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<CommentAttachmentResponseDto[]> {
    return this.commentAttachmentService.getAttachmentsByCommentId(user.id, params.task_id, params.comment_id);
  }

  @Get(':attachment_id/download-url')
  async getDownloadUrl(
    @Param() params: CommentAttachmentByIdParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<{ downloadUrl: string }> {
    return this.commentAttachmentService.getAttachmentDownloadUrl(
      user.id,
      params.task_id,
      params.comment_id,
      params.attachment_id,
    );
  }

  @Delete(':attachment_id')
  async deleteAttachment(
    @Param() params: CommentAttachmentByIdParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<void> {
    return this.commentAttachmentService.deleteAttachment(
      user.id,
      params.task_id,
      params.comment_id,
      params.attachment_id,
    );
  }
}
