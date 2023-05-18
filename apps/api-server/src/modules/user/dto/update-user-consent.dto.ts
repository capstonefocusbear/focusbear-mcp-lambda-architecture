import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsIn, IsNotEmpty, IsObject, IsOptional, IsUUID } from 'class-validator';
import { UserConsentTypes } from '../domain/user-consent.enum';

export class UpdateUserConsentDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsNotEmpty()
  @IsEnum(UserConsentTypes)
  @IsIn(Object.values(UserConsentTypes))
  @ApiProperty({ enum: UserConsentTypes })
  consent_type: UserConsentTypes;

  @IsBoolean()
  @IsNotEmpty()
  consent_status: boolean;

  @IsDate({ message: 'withdrawal_date should be a valid ISO string in UTC zone' })
  @Type(() => Date)
  @IsOptional()
  withdrawal_date?: Date;

  @IsOptional()
  @IsObject()
  metadata?: { policy_version?: string };
}
