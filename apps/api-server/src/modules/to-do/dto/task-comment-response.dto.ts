import { ApiProperty } from '@nestjs/swagger';
import { TaskCommentUserDto } from './task-comment-user.dto';

export class TaskCommentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  task_id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: TaskCommentUserDto })
  user?: TaskCommentUserDto;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}
