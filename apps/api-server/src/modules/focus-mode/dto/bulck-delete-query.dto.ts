import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class BulkDeleteQueryDto {
  @IsNotEmpty()
  @ApiProperty()
  id: string;

  @IsOptional()
  @ApiProperty()
  team_id: string;
}
