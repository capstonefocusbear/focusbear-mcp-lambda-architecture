import { IsNotEmpty } from 'class-validator';

export class UpdateLongTermGoalsDto {
  @IsNotEmpty()
  goals: string[];
}
