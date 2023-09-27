import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

export class GetSyncedProjectsQueryDto {
  @IsNotEmpty()
  @IsEnum(IntegrationPlatforms)
  @ApiProperty({ enum: IntegrationPlatforms })
  platform: IntegrationPlatforms;
}
