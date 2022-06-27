import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class BulckDeleteQueryDto {
  @IsNotEmpty()
  @ApiProperty()
  id: string;
}
