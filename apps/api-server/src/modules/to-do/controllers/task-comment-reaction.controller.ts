import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { TaskCommentReactionService } from '../services/task-comment-reaction.service';
import { CreateTaskCommentReactionDto } from '../dto/create-task-comment-reaction.dto';
import { TaskCommentReactionParamsDto } from '../dto/task-comment-reaction-params.dto';
import { TaskCommentReactionResponseDto } from '../dto/task-comment-reaction-response.dto';

@Controller('to-do/:task_id/comments/:comment_id/reactions')
@ApiTags('task-comment-reactions')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class TaskCommentReactionController {
  constructor(private readonly reactionService: TaskCommentReactionService) {}

  @Post()
  @ApiOperation({ summary: 'Add a reaction to a task comment' })
  @ApiResponse({ status: 201, description: 'Reaction added successfully', type: TaskCommentReactionResponseDto })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiResponse({ status: 409, description: 'User already reacted with this emoji' })
  async addReaction(
    @Param() params: TaskCommentReactionParamsDto,
    @Body() dto: CreateTaskCommentReactionDto,
    @AuthContext() { user }: Passport,
  ): Promise<TaskCommentReactionResponseDto> {
    return this.reactionService.addReaction(user.id, params.task_id, params.comment_id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reactions for a task comment' })
  @ApiResponse({ status: 200, description: 'List of reactions', type: [TaskCommentReactionResponseDto] })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async getReactions(
    @Param() params: TaskCommentReactionParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<TaskCommentReactionResponseDto[]> {
    return this.reactionService.getReactionsByCommentId(user.id, params.task_id, params.comment_id);
  }

  @Delete()
  @ApiOperation({ summary: 'Remove a reaction from a task comment' })
  @ApiResponse({ status: 200, description: 'Reaction removed successfully' })
  @ApiResponse({ status: 404, description: 'Comment or reaction not found' })
  async deleteReaction(
    @Param() params: TaskCommentReactionParamsDto,
    @Query('emoji') emoji: string,
    @AuthContext() { user }: Passport,
  ): Promise<void> {
    return this.reactionService.deleteReaction(user.id, params.task_id, params.comment_id, emoji);
  }
}
