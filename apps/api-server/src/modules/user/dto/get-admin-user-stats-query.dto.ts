import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetAdminUserStatsQueryDto {
  @IsNotEmpty()
  @IsUUID()
  user_id: string;
}
