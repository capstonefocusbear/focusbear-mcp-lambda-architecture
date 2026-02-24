import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteTaskCommentReactionQueryDto {
  @ApiProperty({
    description: 'Emoji for the reaction (single emoji character)',
    example: '👍',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Matches(/^(?:\p{Extended_Pictographic}\uFE0F?(?:\u200d\p{Extended_Pictographic}\uFE0F?)*)+$/u, { message: 'Must be a valid emoji' })
  emoji: string;
}
