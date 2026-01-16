import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiKeyResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the API key',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'A friendly name for the API key',
    example: 'Zapier Integration',
  })
  name: string;

  @ApiProperty({
    description: 'The prefix of the API key (first 8 characters)',
    example: 'fb_live_',
  })
  key_prefix: string;

  @ApiProperty({
    description: 'Whether the API key is active',
    example: true,
  })
  is_active: boolean;

  @ApiPropertyOptional({
    description: 'The expiration date of the API key',
    example: '2025-12-31T23:59:59Z',
  })
  expires_at?: string;

  @ApiPropertyOptional({
    description: 'The last time the API key was used',
    example: '2024-01-15T10:30:00Z',
  })
  last_used_at?: string;

  @ApiProperty({
    description: 'When the API key was created',
    example: '2024-01-01T00:00:00Z',
  })
  created_at: string;
}
