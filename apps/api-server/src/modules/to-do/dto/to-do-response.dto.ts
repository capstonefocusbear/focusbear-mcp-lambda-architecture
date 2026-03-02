import { ApiProperty } from '@nestjs/swagger';
import { ToDo } from '../entities/to-do.entity';
import { TaskCommentResponseDto } from './task-comment-response.dto';
import { TaskCommentReactionResponseDto } from './task-comment-reaction-response.dto';
import { TaskReactionResponseDto } from './task-reaction-response.dto';

export class TaskCommentWithReactionsDto extends TaskCommentResponseDto {
  @ApiProperty({ type: [TaskCommentReactionResponseDto], required: false })
  reactions?: TaskCommentReactionResponseDto[];
}

export class ToDoResponse extends ToDo {
  current_external_status?: any;

  external_statuses?: any;

  top_score?: number;

  @ApiProperty({ type: [TaskCommentWithReactionsDto], required: false })
  comments?: TaskCommentWithReactionsDto[];

  @ApiProperty({ type: [TaskReactionResponseDto], required: false })
  reactions?: TaskReactionResponseDto[];
}
