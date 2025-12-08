import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateHabitWithAiDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  prompt: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  user_goals?: string[];

  @IsOptional()
  @IsNumber()
  routine_duration?: number;

  @IsOptional()
  @IsString()
  routine?: string;
}
