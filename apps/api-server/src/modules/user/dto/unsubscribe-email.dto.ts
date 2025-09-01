import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnsubscribeEmailDto {
  @ApiProperty({ description: 'Unsubscribe token from email link', required: false })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiProperty({ description: 'User ID for direct unsubscribe (authenticated requests)', required: false })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiProperty({ description: 'Reason for unsubscribing', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
