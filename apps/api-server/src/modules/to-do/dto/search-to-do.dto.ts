import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchToDosDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ minimum: 10, maximum: 20, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(20)
  take?: number = 10;
}
