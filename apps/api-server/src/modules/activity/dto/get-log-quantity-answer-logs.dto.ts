import { IsArray, IsNotEmpty } from 'class-validator';

export class GetLogQuantityAnswerLogsDto {
  @IsNotEmpty()
  @IsArray()
  question_ids: string[];
}
