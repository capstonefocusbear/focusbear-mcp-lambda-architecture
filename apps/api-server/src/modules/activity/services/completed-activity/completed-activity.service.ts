import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DeviceService } from '../../../device/services/device/device.service';
import { GetUserSettingsDto } from '../../../user/dto/get-user-settings.dto';
import { User } from '../../../user/entities/user.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { CompletedActivityStatType } from '../../domain/completed-activity-stat-type.enum';
import { CompletedActivityStats } from '../../domain/completed-activity-stats.model';
import { CreateCompletedActivityDto } from '../../dto/create-completed-activity.dto';
import {
  GetCompletedActivityStatsParamsDto,
  GetCompletedActivityStatsQueryDto,
} from '../../dto/get-completed-activity-stats.dto';
import { ActivitySequence } from '../../entities/activity-sequence.entity';
import { Activity } from '../../entities/activity.entity';
import { CompletedActivity } from '../../entities/completed-activity.entity';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { ActivityRepository } from '../../repositories/activity.repository';
import { CompletedActivityRepository } from '../../repositories/completed-activity.repository';
import { CompletedActivitySequenceService } from '../completed-activity-sequence/completed-activity-sequence.service';

@Injectable()
export class CompletedActivityService {
  constructor(
    private readonly completedActivityRepository: CompletedActivityRepository,
    private readonly deviceService: DeviceService,
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    private readonly userRepository: UserRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly completedActivitySequenceService: CompletedActivitySequenceService,
  ) {}

  async compliteActivity(
    completedActivity: CreateCompletedActivityDto,
    { user_id }: GetUserSettingsDto,
  ): Promise<CompletedActivity> {
    const { device_id, activity_sequence_id, activity_id } = completedActivity;
    const [sequence, activity, user] = await this.fetchPreparatoryData(activity_sequence_id, activity_id, user_id);
    this.validateComplitingActivity(user, { activity_sequence_id, activity_id });
    const { nextActivity, ...currentValues } = this.defineNextCurrentActivity(sequence, activity_id);
    await this.deviceService.markAsLeader(device_id, user_id);
    await this.userRepository.orm.update(user_id, { ...currentValues });
    const { log_quantity } = activity;
    const newCompletedActivity = new CompletedActivity(
      { ...completedActivity, user_id },
      { log_quantity, generateId: false },
    );
    const createdItem = await this.completedActivityRepository.create(newCompletedActivity);
    if (!nextActivity) await this.completedActivitySequenceService.compliteActivitySequence(sequence.id, user_id);
    return createdItem;
  }

  private async fetchPreparatoryData(
    activity_sequence_id: string,
    activity_id: string,
    user_id: string,
  ): Promise<[ActivitySequence, Activity, User]> | never {
    const [sequence, activity, user] = await Promise.all([
      this.activitySequenceRepository.orm.findOne(activity_sequence_id),
      this.activityRepository.orm.findOne(activity_id),
      this.userRepository.orm.findOne(user_id),
    ]);
    if (!sequence) throw new NotFoundException(`Activity Sequence with id: ${activity_sequence_id} does not exist!`);
    if (!activity) throw new NotFoundException(`Activity with id: ${activity_id} does not exist!`);
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    return [sequence, activity, user];
  }

  private validateComplitingActivity(user: User, { activity_sequence_id, activity_id }): void | never {
    const { current_activity_id, current_activity_sequence_id } = user;
    const isNewCurrentSequence = !current_activity_sequence_id;
    if (isNewCurrentSequence) return; // additional check, if it is a new Sequence, compliting activity should be first in the order
    const isComplitingActivitySequenceTheCurrent = activity_sequence_id === current_activity_sequence_id;
    const isComplitingActivityTheCurrent = activity_id === current_activity_id;
    const notCurrentSequenceMessage = `activity_sequence_id: ${activity_sequence_id} is not a current sequence: ${current_activity_sequence_id}`;
    const notCurrentActivityMessage = `activity_id: ${activity_id} is not a current activity: ${current_activity_id}`;
    if (!isComplitingActivitySequenceTheCurrent) throw new BadRequestException(notCurrentSequenceMessage);
    if (!isComplitingActivityTheCurrent) throw new BadRequestException(notCurrentActivityMessage);
  }

  private defineNextCurrentActivity(
    sequence: ActivitySequence,
    activity_id: string,
  ): {
    current_activity_sequence_id: string | null;
    current_activity_id: string | null;
    nextActivity: string | null | undefined;
  } {
    const { activity_ids, id } = sequence;
    const completedActivityIndexInTheSequence = activity_ids.findIndex((e) => e === activity_id);
    const noActivityInTheSequense = completedActivityIndexInTheSequence === -1;
    const noActivityInTheSequenseMessage = `Activity with id: ${activity_id} does not exist in the Secuense with id: ${id}!`;
    if (noActivityInTheSequense) throw new ConflictException(noActivityInTheSequenseMessage);
    const nextActivity = activity_ids[completedActivityIndexInTheSequence + 1];
    const current_activity_id = nextActivity || null;
    const current_activity_sequence_id = nextActivity ? id : null;
    return { current_activity_sequence_id, current_activity_id, nextActivity };
  }

  async getStatsByActivityPerDay(
    { activity_id }: GetCompletedActivityStatsParamsDto,
    { days_number }: GetCompletedActivityStatsQueryDto,
  ): Promise<CompletedActivityStats> {
    const activity = await this.activityRepository.orm.findOne(activity_id);
    if (!activity) throw new NotFoundException(`Activity with id: ${activity_id} does not exist!`);
    const { log_summary_type, log_quantity } = activity;
    const stat_type = log_quantity ? CompletedActivityStatType.quantity : CompletedActivityStatType.duration;
    const params = { days_number, log_summary_type, stat_type };
    const items = await this.completedActivityRepository.getAggregatedQuantityLogsPerDay(activity_id, params);
    const stats = new CompletedActivityStats({ activity_id, days_number, items, log_summary_type, stat_type });
    return stats;
  }
}
