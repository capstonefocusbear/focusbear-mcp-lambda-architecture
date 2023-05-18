import { IsArray, IsNumber, IsOptional } from 'class-validator';
import { LogQuantityAnswerDto } from './log-quantity-answers.dto';

export class ReviseCompletedActivityDto {
  @IsOptional()
  @IsNumber()
  quantity_logged?: number;

  @IsOptional()
  @IsArray()
  log_quantity_answers?: LogQuantityAnswerDto[];
}
