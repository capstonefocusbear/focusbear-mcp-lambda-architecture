import { IsString } from 'class-validator';

export class CurrentTaskDto {
  @IsString()
  task_name: string;

  @IsString()
  task_id: string;
}
