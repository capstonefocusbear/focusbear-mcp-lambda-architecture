import { IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class ReviseLogQuantityAnswerDto {
  @IsNotEmpty()
  @IsNumber()
  logged_value: number;

  @IsNotEmpty()
  @IsUUID()
  answer_id: string;
}
