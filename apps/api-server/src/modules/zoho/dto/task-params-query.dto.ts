import { IsOptional } from 'class-validator';

export class TaskParamsQueryDto {
  @IsOptional()
  portalId?: string;

  @IsOptional()
  projectId?: string;

  @IsOptional()
  taskId?: string;
}
