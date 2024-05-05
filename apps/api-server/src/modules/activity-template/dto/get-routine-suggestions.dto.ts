import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class GetRoutineSuggestionsDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  user_goals: string[];

  @IsNotEmpty()
  @IsNumber()
  routine_duration: number;
}
