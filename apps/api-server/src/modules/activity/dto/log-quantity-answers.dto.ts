import { IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class LogQuantityAnswerDto {
  @IsNotEmpty()
  @IsNumber()
  logged_value: number;

  @IsNotEmpty()
  @IsUUID()
  question_id: string;
}
