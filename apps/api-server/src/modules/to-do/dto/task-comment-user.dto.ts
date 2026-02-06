import { ApiProperty } from '@nestjs/swagger';

export class TaskCommentUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false })
  username?: string;
}
