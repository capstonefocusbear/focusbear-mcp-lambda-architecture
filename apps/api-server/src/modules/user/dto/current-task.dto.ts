import { IsString, IsNotEmpty, MaxLength, IsUUID } from 'class-validator';
import { MAX_WORD_LENGTH } from '@app/openai/openai.constants';

export class CurrentTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_WORD_LENGTH.default)
  task_name: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  task_id: string;
}
