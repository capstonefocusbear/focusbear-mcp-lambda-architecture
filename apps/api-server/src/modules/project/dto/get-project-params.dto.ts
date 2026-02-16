import { IsUUID } from 'class-validator';

export class GetProjectParamsDto {
  @IsUUID()
  project_id: string;
}
