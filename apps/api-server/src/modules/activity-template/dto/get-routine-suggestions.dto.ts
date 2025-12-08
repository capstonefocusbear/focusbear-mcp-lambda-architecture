import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class GetRoutineSuggestionsDto {
  @Transform(({ value }) => {
    if (!Array.isArray(value)) {
      return value;
    }
    return value.map((goal) => (typeof goal === 'string' ? goal.trim() : '')).filter((goal) => goal.length > 0);
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true, message: 'Each goal must be at most 200 characters' })
  // eslint-disable-next-line no-misleading-character-class
  @Matches(/^[\p{L}\p{N}\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\s,.'&!?()\-:;]+$/u, {
    each: true,
    message:
      'Goal contains invalid characters. Only letters, numbers, emojis, spaces, and basic punctuation are allowed.',
  })
  user_goals: string[];

  @IsNotEmpty()
  @IsNumber()
  routine_duration: number;

  @IsOptional()
  @IsString()
  routine?: string;

  @IsOptional()
  @IsBoolean()
  groupByGoals?: boolean;
}
