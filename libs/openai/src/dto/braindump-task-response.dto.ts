import { IsNotEmpty, IsNumber, IsString, IsArray } from 'class-validator';

export class BraindumpTaskDto {
  @IsString()
  @IsNotEmpty()
  task_name: string;

  @IsNumber()
  @IsNotEmpty()
  estimated_time: number;

  @IsArray()
  @IsString({ each: true })
  subtasks: string[];
}
