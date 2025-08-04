import { ApiProperty } from '@nestjs/swagger';

export class UploadUsageImageResponseDto {
  @ApiProperty({
    description: 'The ID of the async task created for processing the usage image',
    example: 'uuid-string-here',
  })
  asyncTaskId: string;
}
