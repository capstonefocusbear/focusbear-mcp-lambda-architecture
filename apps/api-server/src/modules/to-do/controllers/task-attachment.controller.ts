import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { TaskAttachmentService } from '../services/task-attachment.service';
import { CreateTaskAttachmentDto } from '../dto/create-task-attachment.dto';
import { TaskAttachmentParamsDto } from '../dto/task-attachment-params.dto';
import { TaskAttachmentByIdParamsDto } from '../dto/task-attachment-by-id-params.dto';
import { TaskAttachmentResponseDto } from '../dto/task-attachment-response.dto';
import { GenerateUploadAttachmentUrlDto } from '../dto/generate-upload-attachment-url.dto';

@Controller('to-do/:task_id/attachments')
@ApiTags('task-attachments')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class TaskAttachmentController {
  constructor(private readonly taskAttachmentService: TaskAttachmentService) {}

  @Post('generate-upload-url')
  async generateUploadUrl(
    @Param() params: TaskAttachmentParamsDto,
    @Body() dto: GenerateUploadAttachmentUrlDto,
    @AuthContext() { user }: Passport,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    return this.taskAttachmentService.generateUploadUrl(user.id, params.task_id, dto);
  }

  @Post()
  async createAttachment(
    @Param() params: TaskAttachmentParamsDto,
    @Body() dto: CreateTaskAttachmentDto,
    @AuthContext() { user }: Passport,
  ): Promise<TaskAttachmentResponseDto> {
    return this.taskAttachmentService.createAttachment(user.id, params.task_id, dto);
  }

  @Get()
  async getAttachments(
    @Param() params: TaskAttachmentParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<TaskAttachmentResponseDto[]> {
    return this.taskAttachmentService.getAttachmentsByTaskId(user.id, params.task_id);
  }

  @Get(':attachment_id/download-url')
  async getDownloadUrl(
    @Param() params: TaskAttachmentByIdParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<{ downloadUrl: string }> {
    return this.taskAttachmentService.getAttachmentDownloadUrl(user.id, params.task_id, params.attachment_id);
  }

  @Delete(':attachment_id')
  async deleteAttachment(
    @Param() params: TaskAttachmentByIdParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<void> {
    return this.taskAttachmentService.deleteAttachment(user.id, params.task_id, params.attachment_id);
  }
}
