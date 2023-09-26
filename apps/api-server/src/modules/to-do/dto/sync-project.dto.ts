import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

export class SyncProjectDto {
  @IsNotEmpty()
  @IsEnum(IntegrationPlatforms)
  @ApiProperty({ enum: IntegrationPlatforms })
  platform?: IntegrationPlatforms;

  @IsString()
  @IsOptional()
  portal_id?: string;

  @IsString()
  @IsOptional()
  project_id?: string;
}
