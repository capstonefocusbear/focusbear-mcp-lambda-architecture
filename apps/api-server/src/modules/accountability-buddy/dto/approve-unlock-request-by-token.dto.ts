import { IsJWT, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveUnlockRequestByTokenDto {
  @ApiProperty({
    description: 'JWT token for unlock request approval from email',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty()
  @IsJWT()
  token: string;
}
