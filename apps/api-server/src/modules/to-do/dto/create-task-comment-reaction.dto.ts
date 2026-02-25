import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TASK_REACTION_EMOJI_REGEX, TASK_REACTION_EMOJI_VALIDATION_MESSAGE } from './task-reaction-emoji-validation';

export class CreateTaskCommentReactionDto {
  @ApiProperty({
    description: 'Emoji for the reaction (single emoji character)',
    example: '👍',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Matches(TASK_REACTION_EMOJI_REGEX, { message: TASK_REACTION_EMOJI_VALIDATION_MESSAGE })
  emoji: string;
}
