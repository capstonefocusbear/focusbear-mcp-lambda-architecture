import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchToDosDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({
    minimum: 10,
    maximum: 20,
    default: 10,
  })
  take?: number = 10;
}
