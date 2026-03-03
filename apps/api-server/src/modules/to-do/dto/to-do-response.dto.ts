import { ApiProperty } from '@nestjs/swagger';
import { ToDo } from '../entities/to-do.entity';
import { TaskCommentReactionResponseDto } from './task-comment-reaction-response.dto';
import { TaskReactionResponseDto } from './task-reaction-response.dto';
import { TaskCommentUserDto } from './task-comment-user.dto';

export class TaskCommentWithReactionsDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  task_id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: TaskCommentUserDto, required: false })
  user?: TaskCommentUserDto;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;

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
