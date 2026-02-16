import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTaskCommentDto {
  @ApiProperty({ description: 'Comment content', maxLength: 10000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
