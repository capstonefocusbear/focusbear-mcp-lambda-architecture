import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ProjectStatusDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  label: string;

  @IsNotEmpty()
  @IsString()
  color: string;

  @IsNotEmpty()
  @IsNumber()
  order: number;

  @IsNotEmpty()
  @IsBoolean()
  should_complete_task: boolean;
}
