import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { TaskCommentService } from '../services/task-comment.service';
import { CreateTaskCommentDto } from '../dto/create-task-comment.dto';
import { UpdateTaskCommentDto } from '../dto/update-task-comment.dto';
import { TaskCommentParamsDto } from '../dto/task-comment-params.dto';
import { TaskCommentByIdParamsDto } from '../dto/task-comment-by-id-params.dto';
import { TaskCommentResponseDto } from '../dto/task-comment-response.dto';
import { PaginationOptionsDto } from '../../../shared/pagination/pagination-options.dto';
import { PaginationDto } from '../../../shared/pagination/index.dto';

@Controller('to-do/:task_id/comments')
@ApiTags('task-comments')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class TaskCommentController {
  constructor(private readonly taskCommentService: TaskCommentService) {}

  @Post()
  async createComment(
    @Param() params: TaskCommentParamsDto,
    @Body() dto: CreateTaskCommentDto,
    @AuthContext() { user }: Passport,
  ): Promise<TaskCommentResponseDto> {
    return this.taskCommentService.createComment(user.id, params.task_id, dto);
  }

  @Get()
  async getComments(
    @Param() params: TaskCommentParamsDto,
    @Query() paginationOptions: PaginationOptionsDto,
    @AuthContext() { user }: Passport,
  ): Promise<PaginationDto<TaskCommentResponseDto>> {
    return this.taskCommentService.getCommentsByTaskId(user.id, params.task_id, paginationOptions);
  }

  @Put(':comment_id')
  async updateComment(
    @Param() params: TaskCommentByIdParamsDto,
    @Body() dto: UpdateTaskCommentDto,
    @AuthContext() { user }: Passport,
  ): Promise<TaskCommentResponseDto> {
    return this.taskCommentService.updateComment(user.id, params.task_id, params.comment_id, dto);
  }

  @Delete(':comment_id')
  async deleteComment(@Param() params: TaskCommentByIdParamsDto, @AuthContext() { user }: Passport): Promise<void> {
    return this.taskCommentService.deleteComment(user.id, params.task_id, params.comment_id);
  }
}
