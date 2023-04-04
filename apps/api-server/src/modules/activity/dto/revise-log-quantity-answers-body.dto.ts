import { IsArray, IsNotEmpty } from 'class-validator';
import { ReviseLogQuantityAnswerDto } from './revise-log-quantity-answer.dto';

export class ReviseLogQuantityAnswersBodyDto {
  @IsNotEmpty()
  @IsArray()
  log_quantity_answers: ReviseLogQuantityAnswerDto[];
}
