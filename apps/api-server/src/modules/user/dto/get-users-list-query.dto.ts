import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { UsersOrderByOptions } from '../domain/find-users-sort-by-options.enum';

export class GetUsersListQueryDto {
  @IsNumber()
  take?: number;

  @IsNumber()
  skip?: number;

  @IsEnum(UsersOrderByOptions)
  @IsOptional()
  @ApiProperty({ enum: UsersOrderByOptions })
  order_by?: UsersOrderByOptions;
}
