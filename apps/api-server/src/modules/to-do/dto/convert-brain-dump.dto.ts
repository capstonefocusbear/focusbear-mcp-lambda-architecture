import { MAX_WORD_LENGTH } from '@app/openai/openai.constants';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ConvertBrainDump {
  @IsNotEmpty()
  @IsString()
  @MaxLength(MAX_WORD_LENGTH.brainDump)
  contents: string;
}
