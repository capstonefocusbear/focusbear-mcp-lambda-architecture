import { IsArray, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { LogQuantityAnswerDto } from './log-quantity-answers.dto';

export class ReviseCompletedActivityDto {
  @IsNotEmpty()
  @IsNumber()
  quantity_logged: number;

  @IsOptional()
  @IsArray()
  log_quantity_answers?: LogQuantityAnswerDto[];
}
