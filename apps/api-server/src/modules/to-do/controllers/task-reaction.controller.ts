import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { TaskReactionService } from '../services/task-reaction.service';
import { CreateTaskReactionDto } from '../dto/create-task-reaction.dto';
import { TaskReactionParamsDto } from '../dto/task-reaction-params.dto';
import { TaskReactionResponseDto } from '../dto/task-reaction-response.dto';

@Controller('to-do/:task_id/reactions')
@ApiTags('task-reactions')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class TaskReactionController {
  constructor(private readonly taskReactionService: TaskReactionService) {}

  @Post()
  @ApiOperation({ summary: 'Add a reaction to a task' })
  @ApiResponse({ status: 201, description: 'Reaction created successfully', type: TaskReactionResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'User does not have access to this task' })
  @ApiResponse({ status: 409, description: 'User has already reacted with this emoji' })
  async createReaction(
    @Param() params: TaskReactionParamsDto,
    @Body() dto: CreateTaskReactionDto,
    @AuthContext() { user }: Passport,
  ): Promise<TaskReactionResponseDto> {
    return this.taskReactionService.createReaction(user.id, params.task_id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reactions for a task' })
  @ApiResponse({ status: 200, description: 'Returns all reactions for the task', type: [TaskReactionResponseDto] })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'User does not have access to this task' })
  async getReactions(
    @Param() params: TaskReactionParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<TaskReactionResponseDto[]> {
    return this.taskReactionService.getReactionsByTaskId(user.id, params.task_id);
  }

  @Delete()
  @ApiOperation({ summary: 'Remove a reaction from a task' })
  @ApiResponse({ status: 200, description: 'Reaction deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task or reaction not found' })
  @ApiResponse({ status: 403, description: 'User can only delete their own reactions' })
  async deleteReaction(
    @Param() params: TaskReactionParamsDto,
    @Query('emoji') emoji: string,
    @AuthContext() { user }: Passport,
  ): Promise<void> {
    return this.taskReactionService.deleteReaction(user.id, params.task_id, emoji);
  }
}
