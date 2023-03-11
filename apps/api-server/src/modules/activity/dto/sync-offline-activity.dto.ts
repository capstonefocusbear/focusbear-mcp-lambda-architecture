import { User } from '../../user/entities/user.entity';
import { CompletedActivityResponse } from '../domain/completed-activity-response.model';
import { ActivitySequence } from '../entities/activity-sequence.entity';
import { Activity } from '../entities/activity.entity';
import { CreateCompletedActivityDto } from './create-completed-activity.dto';
import { CreateSkippedActivityDto } from './create-skipped-activity.dto';

export class SyncOfflineActivityArgs {
  completedActivity: CreateCompletedActivityDto | CreateSkippedActivityDto;

  user: User;

  allActivitiesFromSequence: Activity[];

  sequence: ActivitySequence;

  createdLogs: CompletedActivityResponse[];
}
