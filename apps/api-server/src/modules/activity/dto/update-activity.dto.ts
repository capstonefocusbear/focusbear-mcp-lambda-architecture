import { IsNotEmpty, IsUUID } from 'class-validator';
import { ActivityData } from '../domain/activity-data.model';

export class UpdateActivityDto extends ActivityData {
  @IsNotEmpty()
  @IsUUID('4')
  id: string;
}
