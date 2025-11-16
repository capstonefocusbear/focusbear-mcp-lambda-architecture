import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationOptionsDto } from '../../../shared/pagination/pagination-options.dto';
import { UnlockRequestStatus } from '../domain/unlock-request-status.enum';
import { UnlockRequestRole } from '../domain/unlock-request-role.enum';

export class GetUnlockRequestsQueryDto extends PaginationOptionsDto {
  @ApiPropertyOptional({
    enum: UnlockRequestStatus,
    description: 'Filter by unlock request status',
  })
  @IsOptional()
  @IsEnum(UnlockRequestStatus)
  status?: UnlockRequestStatus;

  @ApiPropertyOptional({
    enum: UnlockRequestRole,
    description:
      'Filter by role: sent (requests I made) or received (requests I need to approve). If not provided, returns both.',
  })
  @IsOptional()
  @IsEnum(UnlockRequestRole)
  role?: UnlockRequestRole;

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
