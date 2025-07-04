import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BulkDeleteDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  member_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  @Type(() => String)
  emails?: string[];

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  team_id: string;
}
