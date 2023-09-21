import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class MapExternalStatusToCompleteDto {
  @IsNotEmpty()
  @IsString()
  project_id: string;

  @IsNotEmpty()
  @IsArray()
  external_statuses: any;
}
