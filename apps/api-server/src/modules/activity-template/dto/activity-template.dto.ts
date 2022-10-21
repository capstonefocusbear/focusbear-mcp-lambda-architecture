import { IsOptional, IsUUID, IsString } from 'class-validator';
import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';

export class UpdateActivityTemplateDto extends UpdateActivityDto {
  @IsOptional()
  @IsUUID()
  @IsString()
  pack_id: string;
}
