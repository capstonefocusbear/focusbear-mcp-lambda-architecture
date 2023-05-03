import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetFocusStatsByTagIdParamDto {
  @IsUUID()
  @IsNotEmpty()
  tag_id: string;
}
