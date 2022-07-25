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
import { PusherService } from '../../../../../../../libs/pusher/src';
import { ActivityCompletedPush } from '../../domain/activity-completed-push.model';

@Injectable()
export class CompletedActivityService {
  constructor(
    private readonly completedActivityRepository: CompletedActivityRepository,
    private readonly deviceService: DeviceService,
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    private readonly userRepository: UserRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly completedActivitySequenceService: CompletedActivitySequenceService,
    private readonly pusher: PusherService,
  ) {}

  async completeActivity(
    completedActivity: CreateCompletedActivityDto,
    { user_id }: GetUserSettingsDto,
  ): Promise<CompletedActivity> {
    const { device_id, activity_sequence_id, activity_id, choice_id } = completedActivity;
    const [sequence, activity, user, choice] = await this.fetchPreparatoryData(
      activity_sequence_id,
      activity_id,
      user_id,
      choice_id,
    );
    this.validateComplitingActivity(user, sequence, activity, choice);
    const { nextActivity, ...currentValues } = this.defineNextCurrentActivity(sequence, activity_id);
    await this.deviceService.markAsLeader(device_id, user_id);
    await this.userRepository.orm.update(user_id, { ...currentValues });
    const createdItem = await this.saveCompletedLog(completedActivity, activity, choice, user_id);
    if (!nextActivity) await this.completedActivitySequenceService.completeActivitySequence(sequence.id, user_id);
    await this.broadcastCompletionEvent(user_id, createdItem.id, { ...completedActivity });
    return createdItem;
  }

  private async fetchPreparatoryData(
    activity_sequence_id: string,
    activity_id: string,
    user_id: string,
    choice_id?: string,
  ): Promise<[ActivitySequence, Activity, User, Activity | null]> | never {
    const [sequence, activity, user, choice] = await Promise.all([
      this.activitySequenceRepository.orm.findOne(activity_sequence_id),
      this.activityRepository.orm.findOne(activity_id),
      this.userRepository.orm.findOne(user_id),
      choice_id ? this.activityRepository.orm.findOne(choice_id) : null,
    ]);
    if (!sequence) throw new NotFoundException(`Activity Sequence with id: ${activity_sequence_id} does not exist!`);
    if (!activity) throw new NotFoundException(`Activity with id: ${activity_id} does not exist!`);
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    return [sequence, activity, user, choice];
  }

  private validateComplitingActivity(
    user: User,
    sequence: ActivitySequence,
    activity: Activity,
    choice?: Activity,
  ): void | never {
    const { current_activity_id, current_activity_sequence_id } = user;
    const isNewCurrentSequence = !current_activity_sequence_id;
    this.validateChoice(activity, choice);
    if (isNewCurrentSequence) return this.validateNewSequence(sequence, activity.id);
    const isComplitingActivitySequenceTheCurrent = sequence.id === current_activity_sequence_id;
    const isComplitingActivityTheCurrent = activity.id === current_activity_id;
    const notCurrentSequenceMessage = `activity_sequence_id: ${sequence.id} is not a current sequence: ${current_activity_sequence_id}`;
    const notCurrentActivityMessage = `activity_id: ${activity.id} is not a current activity: ${current_activity_id}`;
    if (!isComplitingActivitySequenceTheCurrent) throw new BadRequestException(notCurrentSequenceMessage);
    if (!isComplitingActivityTheCurrent) throw new BadRequestException(notCurrentActivityMessage);
  }

  private validateNewSequence({ activity_ids, id }: ActivitySequence, activity_id: string): void | never {
    const completingActivityOrder = activity_ids.indexOf(activity_id);
    const isFirstItemInSequence = completingActivityOrder === 0;
    const errorMessage = `Unable to set new current sequence: ${id}, given activity: ${activity_id} is not first!`;
    if (!isFirstItemInSequence) throw new BadRequestException(errorMessage);
  }

  private validateChoice(activity: Activity, choice?: Activity): void | never {
    if (!activity.has_choices) return;
    const isRequiredChoiceMissed = activity.has_choices && !choice;
    const choiceRequiredMessage = `Activity with id: ${activity.id} cannot be completed without choice_id provided`;
    if (isRequiredChoiceMissed) throw new BadRequestException(choiceRequiredMessage);
    const isProvidedChoiceInvalid = activity.id !== choice.parent_id;
    const invalidChoiceMessage = `Choice: ${choice.id} is not valid for activity: ${activity.id}!`;
    if (isProvidedChoiceInvalid) throw new BadRequestException(invalidChoiceMessage);
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

  private async saveCompletedLog(
    completedActivity: CreateCompletedActivityDto,
    activity: Activity,
    choice: Activity,
    user_id: string,
  ): Promise<CompletedActivity> {
    const { choice_id, ...data } = completedActivity;
    const { has_choices } = activity;
    const completedItem = new CompletedActivity(
      { ...data, user_id },
      { log_quantity: activity.log_quantity, generateId: false },
    );
    const completedChoice = new CompletedActivity(
      { ...data, activity_id: choice?.id, user_id, activity_sequence_id: null },
      { log_quantity: choice?.log_quantity, generateId: false },
    );
    const nullifiedParent = { quantity_logged: null };
    if (has_choices) Object.assign(completedItem, nullifiedParent);
    const [savedCompletedActivity] = await Promise.all([
      this.completedActivityRepository.create(completedItem),
      has_choices ? this.completedActivityRepository.create(completedChoice) : null,
    ]);
    return savedCompletedActivity;
  }

  private async broadcastCompletionEvent(
    user_id: string,
    completed_activity_id: string,
    completedActivity: CreateCompletedActivityDto,
  ): Promise<void> {
    const pushData = new ActivityCompletedPush(completed_activity_id, { ...completedActivity });
    await this.pusher.trigger(`private-${user_id}`, 'activity-completed', pushData);
  }

  async getStatsByActivityPerDay(
    { activity_id }: GetCompletedActivityStatsParamsDto,
    { days_number, timezone }: GetCompletedActivityStatsQueryDto,
  ): Promise<CompletedActivityStats> {
    const activity = await this.activityRepository.orm.findOne(activity_id);
    if (!activity) throw new NotFoundException(`Activity with id: ${activity_id} does not exist!`);
    const { log_summary_type, log_quantity } = activity;
    const stat_type = log_quantity ? CompletedActivityStatType.quantity : CompletedActivityStatType.duration;
    const params = { days_number, log_summary_type, stat_type, timezone };
    const items = await this.completedActivityRepository.getAggregatedQuantityLogsPerDay(activity_id, params);
    const stats = new CompletedActivityStats({
      activity_id,
      days_number,
      items,
      log_summary_type,
      stat_type,
      timezone,
    });
    return stats;
  }
}
