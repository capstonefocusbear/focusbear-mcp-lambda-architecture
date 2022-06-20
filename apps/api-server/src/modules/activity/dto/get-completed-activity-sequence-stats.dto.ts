import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetCompletedActivitySequenceStatsParamsDto {
  @IsNotEmpty()
  @IsUUID('4')
  activity_sequence_id: string;
}
