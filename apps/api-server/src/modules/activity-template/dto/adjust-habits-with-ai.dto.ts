import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateActivityTemplateDto } from './activity-template.dto';

export class AdjustHabitsWithAiDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateActivityTemplateDto)
  current_habits: UpdateActivityTemplateDto[];

  @IsNotEmpty()
  @IsString()
  user_feedback: string;

  @IsOptional()
  @IsString()
  user_goals?: string[];

  @IsOptional()
  @IsString()
  routine_duration?: number;
}
