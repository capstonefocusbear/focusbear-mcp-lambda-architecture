import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { OperatingSystem } from '../../../../shared/domain/operating-system.enum';

export class GetUserOnboardingQueryDto {
  @IsNotEmpty()
  @IsUUID()
  user_id: string;

  @IsOptional()
  @IsEnum(OperatingSystem)
  os?: OperatingSystem;
}
