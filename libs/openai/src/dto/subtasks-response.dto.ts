import { IsNotEmpty, IsNotEmptyObject, IsString } from 'class-validator';

export class SubtasksDto {
  @IsString()
  @IsNotEmpty()
  task: string;

  @IsNotEmptyObject()
  subtasks: { name: string; is_completed: boolean }[];
}
