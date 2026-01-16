import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyResponseDto } from './api-key-response.dto';

export class ApiKeyCreatedResponseDto extends ApiKeyResponseDto {
  @ApiProperty({
    description: 'The full API key (only shown once upon creation)',
    example: 'fb_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
  })
  api_key: string;
}
