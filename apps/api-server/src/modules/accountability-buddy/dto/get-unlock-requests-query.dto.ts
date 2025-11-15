import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationOptionsDto } from '../../../shared/pagination/pagination-options.dto';
import { UnlockRequestStatus } from '../domain/unlock-request-status.enum';

export class GetUnlockRequestsQueryDto extends PaginationOptionsDto {
  @ApiPropertyOptional({
    enum: UnlockRequestStatus,
    description: 'Filter by unlock request status',
  })
  @IsOptional()
  @IsEnum(UnlockRequestStatus)
  status?: UnlockRequestStatus;

  @ApiPropertyOptional({
    description: 'Filter requests created from this date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  created_from?: string;

  @ApiPropertyOptional({
    description: 'Filter requests created until this date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  created_to?: string;
}
