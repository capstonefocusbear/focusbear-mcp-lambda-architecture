import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetAdminTasksQueryDto {
  @IsNotEmpty()
  @IsUUID()
  user_id: string;
}
