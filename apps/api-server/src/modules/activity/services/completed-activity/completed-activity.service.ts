import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DeviceService } from '../../../device/services/device/device.service';
import { GetUserSettingsDto } from '../../../user/dto/get-user-settings.dto';
import { UserRepository } from '../../../user/repositories/user.repository';
import { CompletedActivityStats } from '../../domain/completed-activity-stats.model';
import { CreateCompletedActivityDto } from '../../dto/create-completed-activity.dto';
import {
  GetCompletedActivityStatsParamsDto,
  GetCompletedActivityStatsQueryDto,
} from '../../dto/get-completed-activity-stats.dto';
import { ActivitySequence } from '../../entities/activity-sequence.entity';
import { CompletedActivity } from '../../entities/completed-activity.entity';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { ActivityRepository } from '../../repositories/activity.repository';
import { CompletedActivityRepository } from '../../repositories/completed-activity.repository';

@Injectable()
export class CompletedActivityService {
  constructor(
    private readonly completedActivityRepository: CompletedActivityRepository,
    private readonly deviceService: DeviceService,
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    private readonly userRepository: UserRepository,
    private readonly activityRepository: ActivityRepository,
  ) {}

  async compliteActivity(
    completedActivity: CreateCompletedActivityDto,
    { user_id }: GetUserSettingsDto,
  ): Promise<CompletedActivity> {
    const { device_id, activity_sequence_id, activity_id } = completedActivity;
    const sequence = await this.activitySequenceRepository.orm.findOne(activity_sequence_id);
    if (!sequence) throw new NotFoundException(`Activity Sequence with id: ${activity_sequence_id} does not exist!`);
    const nextCurrentActivity = this.defineNextCurrentActivity(sequence, activity_id);
    await this.deviceService.markAsLeader(device_id, user_id);
    await this.userRepository.orm.update(user_id, { ...nextCurrentActivity });
    const newCompletedActivity = new CompletedActivity({ ...completedActivity, user_id });
    return this.completedActivityRepository.create(newCompletedActivity);
  }

  private defineNextCurrentActivity(
    sequence: ActivitySequence,
    activity_id: string,
  ): {
    current_activity_sequence_id: string | null;
    current_activity_id: string | null;
  } {
    const { activity_ids, id } = sequence;
    const completedActivityIndexInTheSequence = activity_ids.findIndex((e) => e === activity_id);
    const noActivityInTheSequense = completedActivityIndexInTheSequence === -1;
    const noActivityInTheSequenseMessage = `Activity with id: ${activity_id} does not exist in the Secuense with id: ${id}!`;
    if (noActivityInTheSequense) throw new ConflictException(noActivityInTheSequenseMessage);
    const nextActivity = activity_ids[completedActivityIndexInTheSequence + 1];
    const current_activity_id = nextActivity || null;
    const current_activity_sequence_id = nextActivity ? id : null;
    return { current_activity_sequence_id, current_activity_id };
  }

  async getStatsByActivityPerDay(
    { activity_id }: GetCompletedActivityStatsParamsDto,
    { days_number }: GetCompletedActivityStatsQueryDto,
  ): Promise<CompletedActivityStats> {
    const activity = await this.activityRepository.orm.findOne(activity_id);
    if (!activity) throw new NotFoundException(`Activity with id: ${activity_id} does not exist!`);
    const { log_quantity_summary_type } = activity;
    const aggregationParams = { days_number, log_quantity_summary_type };
    const items = await this.completedActivityRepository.getAggregatedQuantityLogsPerDay(
      activity_id,
      aggregationParams,
    );
    const stats = new CompletedActivityStats({ items, log_quantity_summary_type });
    return stats;
  }
}
