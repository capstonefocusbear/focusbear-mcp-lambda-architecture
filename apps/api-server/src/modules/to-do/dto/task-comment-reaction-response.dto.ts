import { ApiProperty } from '@nestjs/swagger';
import { TaskCommentUserDto } from './task-comment-user.dto';

export class TaskCommentReactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  comment_id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ example: '👍' })
  emoji: string;

  @ApiProperty({ type: TaskCommentUserDto })
  user?: TaskCommentUserDto;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}
