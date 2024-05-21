import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class GetRoutineSuggestionsDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  user_goals: string[];

  @IsNotEmpty()
  @IsNumber()
  routine_duration: number;

  @IsOptional()
  @IsString()
  routine?: string;
}
