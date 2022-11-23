import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
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
import { CompletedActivityResponse } from '../../domain/completed-activity-response.model';
import { CurrentActivityState } from '../../domain/current-activity-state.mode';
import { ActivityType } from '../../domain/activity-type.enum';
import { ReviseCompletedActivityDto } from '../../dto/revise-completed-activity.dto';
import { CompletedActivitySequence } from '../../entities/completed-activity-sequence.entity';
import { CompletedFocusBlockRepository } from '../../../focus-mode/repositories/completed-focus-block.repository';
import { CompletedFocusBlock } from '../../../focus-mode/entities/completed-focus-block.entity';
import { FocusModeDaySummaryItem } from '../../../focus-mode/domain/focus-mode-day-summary-item.model';
import { ActivityDurationDaySummaryItem } from '../../domain/activity-duration-day-summary-item.mode';
import { ActivityQuantityDaySummaryItem } from '../../domain/activity-quantity-day-summary-item.mode';
import { DaySummary } from '../../domain/day-summary.mode';
import { SkipActivityDto } from '../../dto/skip-activity.dto';

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
    private readonly completedFocusModesRepository: CompletedFocusBlockRepository,
  ) {}

  async completeActivity(
    completedActivity: CreateCompletedActivityDto,
    { user_id }: GetUserSettingsDto,
  ): Promise<CompletedActivityResponse> {
    const { device_id, activity_sequence_id, activity_id, choice_id } = completedActivity;
    const [sequence, activity, user, choice] = await this.fetchPreparatoryData(
      activity_sequence_id,
      activity_id,
      user_id,
      choice_id,
    );
    if (activity.type === ActivityType.break) {
      const isThereIncompletedCurrentSequence = user.current_activity_sequence_id;
      const incompletSequenceMsg = 'There is incomplete current sequence for the user, finish it before doing break!';
      if (isThereIncompletedCurrentSequence) throw new BadRequestException(incompletSequenceMsg);
      this.validateChoice(activity, choice);
      await this.deviceService.markAsLeader(device_id, user_id);
      const createdItem = await this.saveCompletedLog(completedActivity, activity, choice, user_id);
      await this.broadcastCompletionEvent(user_id, createdItem.completed_activity_log.id, { ...completedActivity });
      return createdItem;
    }
    const completingSequenceLog = await this.updateUserAndSequence(
      completedActivity,
      { user_id },
      user,
      sequence,
      activity,
      choice,
      true,
    );
    const createdItem = await this.saveCompletedLog(
      completedActivity,
      activity,
      choice,
      user_id,
      completingSequenceLog,
    );
    await this.broadcastCompletionEvent(user_id, createdItem.completed_activity_log.id, { ...completedActivity });
    return createdItem;
  }

  async skipActivity(activityData: SkipActivityDto, { user_id }: GetUserSettingsDto) {
    const { activity_sequence_id, activity_id, choice_id } = activityData;
    const [sequence, activity, user, choice] = await this.fetchPreparatoryData(
      activity_sequence_id,
      activity_id,
      user_id,
      choice_id,
    );
    await this.saveActivityAsSkipped(user, activity_id);
    await this.updateUserAndSequence(activityData, { user_id }, user, sequence, activity, choice, true);
  }

  async saveActivityAsSkipped(user: User, activity_id: string) {
    const skippedActivities = user.current_sequence_skipped_activities ?? [];
    skippedActivities.push(activity_id);
    await this.userRepository.update(user.id, { current_sequence_skipped_activities: skippedActivities });
  }

  async updateUserAndSequence(
    activityData: CreateCompletedActivityDto | SkipActivityDto,
    { user_id }: GetUserSettingsDto,
    user: User,
    sequence: ActivitySequence,
    activity: Activity,
    choice: Activity,
    is_skipped: boolean,
  ) {
    this.validateCompletingActivity(user, sequence, activity, choice);
    const { device_id, activity_sequence_id, activity_id } = activityData;
    const start_time = activityData?.start_time ?? new Date();
    const completingSequenceLog = await this.completedActivitySequenceService.getOrCreateCompletingSequenceLog(
      user,
      activity_sequence_id,
      start_time,
    );
    let current_state: CurrentActivityState;
    let next_activity: string;
    if (is_skipped) {
      const { nextActivity, currentState } = this.defineNextCurrentActivity(sequence, activity_id, user);
      current_state = currentState;
      next_activity = nextActivity;
    } else {
      const { nextActivity, currentState } = this.defineNextCurrentActivity(sequence, activity_id, user, activityData);
      current_state = currentState;
      next_activity = nextActivity;
    }
    const current_completing_sequence_log_id = next_activity ? completingSequenceLog.id : null;
    await this.deviceService.markAsLeader(device_id, user_id);
    await this.userRepository.orm.update(user_id, { ...current_state, current_completing_sequence_log_id });
    if (!next_activity) {
      await this.completedActivitySequenceService.completeActivitySequence(completingSequenceLog.id, user_id);
    }
    return completingSequenceLog;
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
      this.userRepository.orm.findOne(user_id, { relations: ['completing_sequence_log'] }),
      choice_id ? this.activityRepository.orm.findOne(choice_id) : null,
    ]);
    if (!sequence) throw new NotFoundException(`Activity Sequence with id: ${activity_sequence_id} does not exist!`);
    if (!activity) throw new NotFoundException(`Activity with id: ${activity_id} does not exist!`);
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    const invalidSequenceMsg = `Activity with id: ${activity_id} is not a part of the sequence with id: ${sequence.id}!`;
    if (activity.activity_sequence_id !== sequence.id) throw new BadRequestException(invalidSequenceMsg);
    return [sequence, activity, user, choice];
  }

  private validateCompletingActivity(
    user: User,
    sequence: ActivitySequence,
    activity: Activity,
    choice?: Activity,
  ): void | never {
    const { current_activity_sequence_id } = user;
    const isNewCurrentSequence = !current_activity_sequence_id;
    this.validateChoice(activity, choice);
    if (isNewCurrentSequence) return;
    const isCompletingActivitySequenceTheCurrent = sequence.id === current_activity_sequence_id;
    const notCurrentSequenceMessage = `activity_sequence_id: ${sequence.id} is not a current sequence: ${current_activity_sequence_id}`;
    if (!isCompletingActivitySequenceTheCurrent) throw new BadRequestException(notCurrentSequenceMessage);
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
    user: User,
    completedActivity?: CreateCompletedActivityDto | SkipActivityDto,
  ): {
    currentState: CurrentActivityState;
    nextActivity: string | null | undefined;
  } {
    const { sequenceActivityIds, id } = sequence;
    const completedActivityIndexInTheSequence = sequenceActivityIds.findIndex((e) => e === activity_id);
    const noActivityInTheSequense = completedActivityIndexInTheSequence === -1;
    const noActivityInTheSequenseMessage = `Activity with id: ${activity_id} does not exist in the Secuense with id: ${id}!`;
    if (noActivityInTheSequense) throw new ConflictException(noActivityInTheSequenseMessage);
    const nextActivity = sequenceActivityIds[completedActivityIndexInTheSequence + 1];
    const currentActivityIndex = completedActivityIndexInTheSequence;
    const currentState = new CurrentActivityState(
      {
        nextActivity,
        lastSequenceId: id,
        currentActivityIndex,
      },
      user,
      completedActivity,
    );
    return { nextActivity, currentState };
  }

  private async saveCompletedLog(
    completedActivity: CreateCompletedActivityDto,
    activity: Activity,
    choice: Activity,
    user_id: string,
    sequenceLog?: CompletedActivitySequence,
  ): Promise<CompletedActivityResponse> {
    const { choice_id, ...data } = completedActivity;
    const { has_choices } = activity;
    const completedItem = new CompletedActivity(
      { ...data, user_id, completed_sequence_id: sequenceLog?.id },
      { log_quantity: activity.log_quantity, generateId: false },
    );
    const completedChoice = new CompletedActivity(
      { ...data, activity_id: choice?.id, user_id, activity_sequence_id: null },
      { log_quantity: choice?.log_quantity, generateId: false },
    );
    const nullifiedParent = { quantity_logged: null };
    if (has_choices) Object.assign(completedItem, nullifiedParent);
    const [completed_activity_log, completed_choice_log] = await Promise.all([
      this.completedActivityRepository.create(completedItem),
      has_choices ? this.completedActivityRepository.create(completedChoice) : null,
    ]);
    return new CompletedActivityResponse({ completed_activity_log, completed_choice_log });
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

  async getCompletedLogsByActivityInTimeRange(
    { activity_id }: GetCompletedActivityStatsParamsDto,
    { from_time, to_time },
  ): Promise<CompletedActivity[]> {
    return this.completedActivityRepository.getLogsByActivityInTimeRange(activity_id, { from_time, to_time });
  }

  async reviseCompletedLog(id: string, { quantity_logged }: ReviseCompletedActivityDto): Promise<CompletedActivity> {
    const log = await this.completedActivityRepository.orm.findOne(id);
    if (!log) throw new NotFoundException(`Completed log with id: ${id} does not exist!`);
    log.quantity_logged = quantity_logged;
    return this.completedActivityRepository.orm.save(log);
  }

  async getDaySummary(user_id: string, timezone: string): Promise<DaySummary> {
    const timerange = await this.defineStartupTimestamp(user_id, timezone);
    const [focusSummaryItems, daySummaryAVGItems, daySummarySUMItems, daySummaryDurationItems] = await Promise.all([
      this.completedFocusModesRepository.getLogsByUserInTimeRange(user_id, { ...timerange }),
      this.completedActivityRepository.getDaySummaryAVG(user_id, { ...timerange }),
      this.completedActivityRepository.getDaySummarySUM(user_id, { ...timerange }),
      this.completedActivityRepository.getDaySummaryDuration(user_id, { ...timerange }),
    ]);
    return new DaySummary({
      focusSummary: this.countFocusModeSummary(focusSummaryItems),
      daySummaryAVG: this.countSummaryAVG(daySummaryAVGItems),
      daySummarySUM: this.countSummarySUM(daySummarySUMItems),
      daySummaryDuration: this.countSummaryDuration(daySummaryDurationItems),
    });
  }

  async getWeekSummary(user_id: string): Promise<CompletedActivity[]> {
    const user = await this.userRepository.orm.findOne(user_id);
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    return this.completedActivityRepository.getWeekSummary(user_id);
  }

  private async defineStartupTimestamp(user_id: string, timezone: string): Promise<any> {
    const user = await this.userRepository.orm.findOne(user_id);
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    const { startup_time } = user;
    if (!startup_time) throw new BadRequestException('The user has no startup_time setting specified!');
    const timerange = this.buildTimestamp(startup_time, timezone);
    return timerange;
  }

  private buildTimestamp(startup_time: string, timeZone: string): { from_time: string; to_time: string } {
    let to_time;
    let startupTime;
    let from_time;
    try {
      startupTime = `${startup_time}:00`;
      to_time = DateTime.local({ zone: timeZone }).toUTC().toISO();
      if (to_time === null) throw new BadRequestException(`Invalid timezone: ${timeZone}`);
      const currentTime = DateTime.local({ zone: timeZone });
      const { year, month, day } = currentTime;
      let [hours, minutes, seconds] = startupTime.split(':');
      hours = Number(hours);
      minutes = Number(minutes);
      seconds = Number(seconds);
      from_time = DateTime.local(year, month, day, hours, minutes, seconds, {
        zone: timeZone,
      })
        .toUTC()
        .toISO();
      return { from_time, to_time };
    } catch (e) {
      console.error(
        `Error in buildtimeStamp. to_time: ${to_time}, startupTime: ${startupTime}, from_time: ${from_time}, timezone: ${timeZone}`,
      );
      throw e;
    }
  }

  private groupByName(items: CompletedActivity[]) {
    const result = new Map();
    for (const item of items) {
      const existingValue = result.get(item.activity.activity_data.name) ?? [];
      if (existingValue.length < 1) result.set(item.activity.activity_data.name, existingValue);
      existingValue.push(item);
    }
    return Object.fromEntries(result);
  }

  private countSummaryAVG(logs: CompletedActivity[]): ActivityQuantityDaySummaryItem[] {
    const groupedItems = this.groupByName(logs);
    const entries = Object.entries(groupedItems) as Array<[string, Array<any>]>;
    return entries.map(([name, items]) => ({
      name,
      quantity: items.reduce((acc, { quantity_logged = 0 }) => acc + Number(quantity_logged), 0) / items.length,
    }));
  }

  private countSummarySUM(logs: CompletedActivity[]): ActivityQuantityDaySummaryItem[] {
    const groupedItems = this.groupByName(logs);
    const entries = Object.entries(groupedItems) as Array<[string, Array<any>]>;
    return entries.map(([name, items]) => ({
      name,
      quantity: items.reduce((acc, { quantity_logged = 0 }) => acc + Number(quantity_logged), 0),
    }));
  }

  private countSummaryDuration(logs: CompletedActivity[]): ActivityDurationDaySummaryItem[] {
    const groupedItems = this.groupByName(logs);
    const entries = Object.entries(groupedItems) as Array<[string, Array<any>]>;
    return entries.map(([name, items]) => ({
      name,
      duration: items.reduce((acc, { duration_logged = 0 }) => acc + Number(duration_logged), 0),
    }));
  }

  private countFocusModeSummary(items: CompletedFocusBlock[]): FocusModeDaySummaryItem[] {
    return items.map(({ focus_mode, start_time, finish_time, achievements = '', distractions = '' }) => ({
      name: focus_mode.name,
      start_time,
      duration: (new Date(finish_time).getTime() - new Date(start_time).getTime()) / 1000,
      achievements,
      distractions,
    }));
  }
}
