import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class TrackEventDto {
  @IsNotEmpty()
  @IsString()
  event_type: string;

  @IsObject()
  user_properties?: Record<string, unknown>;

  @IsObject()
  event_data?: Record<string, unknown>;
}
