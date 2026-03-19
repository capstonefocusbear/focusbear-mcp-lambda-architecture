import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class UserGoalDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200, { message: 'Each goal must be at most 200 characters' })
  @Matches(/^[\p{L}\p{N}\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\s,.'&!?()\-:;]+$/u, {
    message:
      'Goal contains invalid characters. Only letters, numbers, emojis, spaces, and basic punctuation are allowed.',
  })
  goal: string;

  @IsOptional()
  @IsBoolean()
  isCustom?: boolean;
}

export type UserGoalInput = UserGoalDto | string;
