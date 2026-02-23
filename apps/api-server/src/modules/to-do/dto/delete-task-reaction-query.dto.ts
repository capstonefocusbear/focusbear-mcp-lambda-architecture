import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteTaskReactionQueryDto {
  @ApiProperty({ description: 'Emoji reaction to remove', example: '👍' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Matches(/^[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Presentation}]+$/u, {
    message: 'emoji must be a valid emoji character',
  })
  emoji: string;
}
