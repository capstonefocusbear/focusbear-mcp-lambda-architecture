import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetDevicesQueryDto {
  @IsNotEmpty()
  @IsUUID()
  user_id: string;
}
