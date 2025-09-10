import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AdjustHabitsWithAiDto {
  @IsNotEmpty()
  @IsArray()
  current_habits: any[];

  @IsNotEmpty()
  @IsString()
  user_feedback: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  user_goals?: string[];

  @IsOptional()
  @IsNumber()
  routine_duration?: number;

  @IsOptional()
  @IsBoolean()
  groupByGoals?: boolean;
}
