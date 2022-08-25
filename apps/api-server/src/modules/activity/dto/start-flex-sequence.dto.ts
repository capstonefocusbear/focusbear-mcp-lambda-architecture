import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class StartFlexSequenceDto {
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  generated_sequence_activity_ids: string[];
}
