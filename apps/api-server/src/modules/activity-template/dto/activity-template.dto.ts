import { IsOptional, IsUUID, IsString, IsArray } from 'class-validator';
import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';

export class UpdateActivityTemplateDto extends UpdateActivityDto {
  @IsOptional()
  @IsUUID()
  @IsString()
  pack_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
