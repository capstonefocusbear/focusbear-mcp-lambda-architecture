import { ApiProperty } from '@nestjs/swagger';

export class TaskCommentUserDto {
  @ApiProperty()
  id: string;
}
