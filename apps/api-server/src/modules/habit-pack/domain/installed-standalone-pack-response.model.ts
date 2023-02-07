import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';

export class InstalledStandalonePackResponse {
  id: string;

  pack_name: string;

  pack_id: string;

  standalone_activities: UpdateActivityDto[];
}
