import { ApiProperty } from '@nestjs/swagger';
import { TaskCommentUserDto } from './task-comment-user.dto';

export class CommentAttachmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  comment_id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  file_name: string;

  @ApiProperty()
  file_key: string;

  @ApiProperty()
  content_type: string;

  @ApiProperty()
  file_size: number;

  @ApiProperty()
  download_url?: string;

  @ApiProperty({ type: TaskCommentUserDto })
  user?: TaskCommentUserDto;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}
