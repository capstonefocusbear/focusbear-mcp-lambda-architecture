import { IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class UpdateGeofenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(10000)
  radius?: number;

  @IsOptional()
  @IsString()
  trigger_after_time?: string;

  @IsOptional()
  @IsUUID('4')
  associated_routine_id?: string;
}
