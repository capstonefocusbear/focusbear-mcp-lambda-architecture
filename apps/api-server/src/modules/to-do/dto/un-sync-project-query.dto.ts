import { IsNotEmpty, IsString } from 'class-validator';

export class UnSyncProjectQueryDto {
  @IsNotEmpty()
  @IsString()
  project_id: string;
}
