import { IsNotEmpty, IsNumber } from 'class-validator';

export class ReviseCompletedActivityDto {
  @IsNotEmpty()
  @IsNumber()
  quantity_logged: number;
}
