import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID, ValidateIf } from 'class-validator';

export class BulckDeleteQueryDto {
  @IsNotEmpty()
  @ApiProperty()
  @ValidateIf((o) => Array.isArray(o))
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  id: string[] | string;
}
