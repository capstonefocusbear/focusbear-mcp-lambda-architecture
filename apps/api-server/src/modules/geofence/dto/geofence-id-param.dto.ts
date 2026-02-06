import { IsNotEmpty, IsUUID } from 'class-validator';

export class GeofenceIdParamDto {
  @IsUUID()
  @IsNotEmpty()
  geofence_id: string;
}
