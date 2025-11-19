import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty } from 'class-validator';

export class ApproveUnlockRequestDto {
  @ApiProperty({
    description: 'JWT token for approving an unlock request',
    example: 'eyJ..',
  })
  @IsNotEmpty()
  @IsJWT()
  token: string;
}
