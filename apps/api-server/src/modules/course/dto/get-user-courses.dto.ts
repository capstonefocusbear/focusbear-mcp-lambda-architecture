import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class GetUserCoursesDto {
  @ApiPropertyOptional({
    type: Boolean,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  hidden: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  deleted: boolean;
}
