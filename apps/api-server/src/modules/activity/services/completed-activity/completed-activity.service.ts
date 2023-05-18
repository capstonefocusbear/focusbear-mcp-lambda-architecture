import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { In } from 'typeorm';
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
import { UserSettingsService } from '../../../user/services/user-settings/user-settings.service';
import { CreateSkippedActivityDto } from '../../dto/create-skipped-activity.dto';
import { ActivityPriority } from '../../domain/activity-priority.enum';
import { UserDailyStatsService } from '../../../user/services/user-daily-stats/user-daily-stats.service';
import { HelperCommonService } from '../../../helper/services/helper-common/helper-common.service';
import { ActivitySequenceService } from '../activity-sequence/activity-sequence.service';
import { FetchNotesParamsDto } from '../../dto/fetch-notes-params.dto';
import { SyncOfflineActivityArgs } from '../../dto/sync-offline-activity.dto';
import { LogQuantityAnswer } from '../../entities/log-quantity-answers';
import { LogQuantityAnswerDto } from '../../dto/log-quantity-answers.dto';
import { LogQuantityAnswersRepository } from '../../repositories/log-quantity-answers.repository';
import { LogQuantityQuestionsRepository } from '../../repositories/log-quantity-questions.repository';
import { LogQuantityAnswersStats } from '../../domain/log-quantity-answers-stats.model';
import { ActivityChoiceType } from '../../domain/activity-choice-type.enum';
import { GetLogQuantityAnswerLogsDto } from '../../dto/get-log-quantity-answer-logs.dto';
import { UserService } from '../../../user/services/user/user.service';

@Injectable()
export class CompletedActivityService {
  constructor(
    private readonly completedActivityRepository: CompletedActivityRepository,
    @Inject(forwardRef(() => DeviceService))
    private readonly deviceService: DeviceService,
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    private readonly userRepository: UserRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly completedActivitySequenceService: CompletedActivitySequenceService,
    private readonly pusher: PusherService,
    private readonly completedFocusModesRepository: CompletedFocusBlockRepository,
    private readonly userSettingsService: UserSettingsService,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly userDailyStatsService: UserDailyStatsService,
    private readonly helperCommonService: HelperCommonService,
    private readonly activitySequenceService: ActivitySequenceService,
    private readonly logQuantityAnswerRepository: LogQuantityAnswersRepository,
    private readonly logQuantityQuestionRepository: LogQuantityQuestionsRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async completeActivity(
    completedActivity: CreateCompletedActivityDto,
    { user_id }: GetUserSettingsDto,
  ): Promise<CompletedActivityResponse> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Completing activity',
        data: {
          user_id,
          completedActivity,
        },
      });
      const {
        device_id,
        activity_sequence_id,
        activity_id,
        choice_id,
        should_not_update_current_activity,
        log_quantity_answers,
      } = completedActivity;
      const [sequence, activity, user, choice] = await this.fetchPreparatoryData(
        activity_sequence_id,
        activity_id,
        user_id,
        choice_id,
      );
      if (activity.activity_data?.choice_type === ActivityChoiceType.competency) {
        await this.updateCompetencyLevel(
          activity,
          log_quantity_answers?.length ? log_quantity_answers : completedActivity.quantity_logged,
        );
      }
      let logQuantityAnswers: LogQuantityAnswer[] = [];
      if (activity.type === ActivityType.break) {
        this.validateChoice(activity, choice);
        await this.deviceService.markAsLeader(device_id, user_id);
        const createdItem = await this.saveCompletedLog(completedActivity, activity, choice, user_id);
        if (log_quantity_answers?.length > 0) {
          logQuantityAnswers = await this.saveLogQuantityAnswers(createdItem, log_quantity_answers);
        }
        return new CompletedActivityResponse({ ...createdItem, saved_log_quantity_answers: logQuantityAnswers });
      }
      let completingSequenceLog = null;
      if (!should_not_update_current_activity) {
        completingSequenceLog = await this.updateUserAndSequence(
          completedActivity,
          { user_id },
          user,
          sequence,
          activity,
          choice,
        );
      }
      const createdItem = await this.saveCompletedLog(
        completedActivity,
        activity,
        choice,
        user_id,
        should_not_update_current_activity,
        completingSequenceLog,
      );
      if (log_quantity_answers?.length > 0) {
        logQuantityAnswers = await this.saveLogQuantityAnswers(createdItem, log_quantity_answers);
      }
      await this.broadcastCompletionEvent(user_id, createdItem.completed_activity_log.id, { ...completedActivity });
      const isCurrentActivityIsMorningOrEveningType =
        activity.type === ActivityType.morning || activity.type === ActivityType.evening;
      const shouldUpdateDailyStats = !should_not_update_current_activity && isCurrentActivityIsMorningOrEveningType;
      if (shouldUpdateDailyStats) {
        await this.userDailyStatsService.updateDailyStatsRoutineCompletion(
          user,
          activity.type,
          createdItem.completed_activity_log.completed_sequence_id,
          completedActivity.start_time,
          user.timezone,
        );
      }
      return new CompletedActivityResponse({ ...createdItem, saved_log_quantity_answers: logQuantityAnswers });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async completeMultipleActivities(
    completedActivities: (CreateCompletedActivityDto | CreateSkippedActivityDto)[],
    { user_id }: GetUserSettingsDto,
  ) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Completing multiple activities',
        data: { user_id },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
      const createdLogs: CompletedActivityResponse[] = [];
      const groupedActivities = this.groupActivitiesByDateAndSequence(completedActivities);
      const activitySequenceCache = {};
      const activitiesCache = {};
      await Promise.all(
        groupedActivities.map(async (group) => {
          const activitiesGroupedByDateAndSequence = Object.entries(group);
          for await (const [sequenceId, activities] of activitiesGroupedByDateAndSequence) {
            let sequence: ActivitySequence;
            let allActivitiesFromSequence: Activity[];
            if (!Object.keys(activitySequenceCache).includes(sequenceId)) {
              sequence = await this.activitySequenceRepository.orm.findOneBy({ id: sequenceId });
              activitySequenceCache[sequenceId] = sequence;
              allActivitiesFromSequence = await this.activityRepository.orm.find({
                where: { activity_sequence_id: sequenceId, user_id },
              });
              activitiesCache[sequenceId] = allActivitiesFromSequence;
            } else {
              sequence = activitySequenceCache[sequenceId];
              allActivitiesFromSequence = activitiesCache[sequenceId];
            }
            for await (const completedActivity of activities) {
              await this.syncOfflineActivity({
                completedActivity,
                user,
                allActivitiesFromSequence,
                sequence,
                createdLogs,
              });
            }
          }
        }),
      );
      return createdLogs;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async syncOfflineActivity({
    completedActivity,
    user,
    allActivitiesFromSequence,
    sequence,
    createdLogs,
  }: SyncOfflineActivityArgs) {
    try {
      const startTime = completedActivity.start_time;
      const completingSequenceLog =
        await this.completedActivitySequenceService.getOrCreateCompletingSequenceLogForSyncing(
          user,
          sequence.id,
          startTime,
        );
      const { choice_id, activity_id, log_quantity_answers } = completedActivity;
      const activity = allActivitiesFromSequence.find((fetchedActivity) => fetchedActivity.id === activity_id);
      if (activity) {
        const choice = choice_id ? await this.activityRepository.orm.findOneBy({ id: choice_id }) : null;
        // if activity was done without app, save a finish time for it to show up in stats
        let { finish_time } = completedActivity;
        if (completedActivity.metadata?.skipped_did_complete) {
          finish_time = completedActivity.start_time;
        }
        const createdItem = await this.saveCompletedLog(
          { ...completedActivity, finish_time },
          activity,
          choice,
          user.id,
          false,
          completingSequenceLog,
        );
        let logQuantityAnswers: LogQuantityAnswer[] = [];
        if (log_quantity_answers?.length > 0) {
          logQuantityAnswers = await this.saveLogQuantityAnswers(createdItem, log_quantity_answers);
        }
        if (activity.activity_data?.choice_type === ActivityChoiceType.competency) {
          await this.updateCompetencyLevel(
            activity,
            log_quantity_answers?.length ? log_quantity_answers : completedActivity.quantity_logged,
          );
        }
        const { nextActivity } = this.defineNextCurrentActivity(sequence, activity_id, user, completedActivity);
        const { is_completed } = completingSequenceLog;
        // mark sequence as completed if no more activities or update sequence if incoming activity is from completed sequence
        if ((!nextActivity && !is_completed) || is_completed) {
          await this.completedActivitySequenceService.completeActivitySequenceByDate(
            completingSequenceLog.id,
            user.id,
            startTime,
          );
        }
        createdLogs.push(
          new CompletedActivityResponse({ ...createdItem, saved_log_quantity_answers: logQuantityAnswers }),
        );
        if (activity.type === ActivityType.morning || activity.type === ActivityType.evening) {
          await this.userDailyStatsService.updateDailyStatsRoutineCompletion(
            user,
            activity.type,
            createdItem.completed_activity_log.completed_sequence_id,
            startTime,
            user.timezone,
            true,
          );
        }
      }
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
    }
  }

  async skipActivity(skippedActivity: CreateSkippedActivityDto, { user_id }: GetUserSettingsDto) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Skipping activity',
        data: {
          user_id,
          skippedActivity,
        },
      });
      const { activity_sequence_id, activity_id, choice_id } = skippedActivity;
      const [sequence, activity, user, choice] = await this.fetchPreparatoryData(
        activity_sequence_id,
        activity_id,
        user_id,
        choice_id,
      );
      const skippedActivityMetadata = { skipped_did_not_complete: true };
      const completingSequenceLog = await this.updateUserAndSequence(
        { ...skippedActivity, metadata: skippedActivityMetadata },
        { user_id },
        user,
        sequence,
        activity,
        choice,
      );
      const createdItem = await this.saveCompletedLog(
        { ...skippedActivity, metadata: skippedActivityMetadata },
        activity,
        choice,
        user_id,
        false,
        completingSequenceLog,
      );
      return createdItem;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async updateUserAndSequence(
    activityData: CreateCompletedActivityDto | CreateSkippedActivityDto,
    { user_id }: GetUserSettingsDto,
    user: User,
    sequence: ActivitySequence,
    activity: Activity,
    choice: Activity,
  ) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Updating user and sequence',
      data: {
        user_id,
      },
    });
    await this.validateCompletingActivity(user, sequence, activity, choice);
    const { device_id, activity_sequence_id, activity_id, metadata } = activityData;
    const start_time = activityData?.start_time ?? new Date();
    const completingSequenceLog = await this.completedActivitySequenceService.getOrCreateCompletingSequenceLog(
      user,
      activity_sequence_id,
      start_time,
    );
    const { nextActivity, currentState } = this.defineNextCurrentActivity(sequence, activity_id, user, activityData);
    const current_completing_sequence_log_id = nextActivity ? completingSequenceLog.id : null;
    await this.deviceService.markAsLeader(device_id, user_id);
    const skippedActivityIds = user.current_sequence_skipped_activities ?? [];
    if (metadata?.is_skipped || metadata?.skipped_did_not_complete) {
      skippedActivityIds.push(activity_id);
    }
    await this.userRepository.orm.update(user_id, {
      ...currentState,
      current_completing_sequence_log_id,
      current_sequence_skipped_activities: skippedActivityIds.length !== 0 ? skippedActivityIds : null,
    });
    if (!nextActivity) {
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
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Fetching preparatory data',
      data: {
        user_id,
        activity_id,
        activity_sequence_id,
        choice_id,
      },
    });
    const [sequence, activity, user, choice] = await Promise.all([
      this.activitySequenceRepository.orm.findOne({ where: { id: activity_sequence_id }, relations: ['activities'] }),
      this.activityRepository.orm.findOneBy({ id: activity_id }),
      this.userRepository.orm.findOne({ where: { id: user_id }, relations: ['completing_sequence_log'] }),
      choice_id ? this.activityRepository.orm.findOneBy({ id: choice_id }) : null,
    ]);
    if (!sequence) throw new NotFoundException(`Activity Sequence with id: ${activity_sequence_id} does not exist!`);
    if (!activity) throw new NotFoundException(`Activity with id: ${activity_id} does not exist!`);
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    const invalidSequenceMsg = `Activity with id: ${activity_id} is not a part of the sequence with id: ${sequence.id}!`;
    if (activity.activity_sequence_id !== sequence.id) throw new BadRequestException(invalidSequenceMsg);
    return [sequence, activity, user, choice];
  }

  private async validateCompletingActivity(
    user: User,
    sequence: ActivitySequence,
    activity: Activity,
    choice?: Activity,
  ): Promise<void | never> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Validating completing activity',
      data: {
        user_id: user.id,
      },
    });
    const { current_activity_sequence_id } = user;
    const isNewCurrentSequence = !current_activity_sequence_id;
    this.validateChoice(activity, choice);
    if (isNewCurrentSequence) return;
    const isCompletingActivitySequenceTheCurrent = sequence.id === current_activity_sequence_id;
    if (!isCompletingActivitySequenceTheCurrent) {
      await this.completedActivitySequenceService.forceCompleteCurrentSequence(
        current_activity_sequence_id,
        user.id,
        true,
      );
    }
  }

  private validateChoice(activity: Activity, choice?: Activity): void | never {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Validating activity choice',
      data: {
        activity_id: activity.id,
        choice_id: choice?.id,
      },
    });
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
    completedActivity?: CreateCompletedActivityDto | CreateSkippedActivityDto,
  ): {
    currentState: CurrentActivityState;
    nextActivity: string | null | undefined;
  } {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Defining next current activity',
      data: {
        user_id: user.id,
        activity_id,
        completed_activity_id: completedActivity?.activity_id,
      },
    });
    const currentDay = this.helperCommonService.getDayOfWeek(user.timezone);
    const { sequenceActivityIds, id, activities, activity_ids } = sequence;
    const { timezone, cutoff_time_for_non_high_priority_activities: cutOffTime } = user;
    // check if activity exists in entire sequence
    this.activitySequenceService.checkIfActivityExistsInSequence(sequenceActivityIds, activity_id, id);
    const activitiesForToday = this.activitySequenceService.filterActivitiesForCurrentDay(currentDay, activities);
    // sorts the activities for current day in order they should be executed in
    const sortedIdsForCurrentDayActivities = this.activitySequenceService.sortActivityIdsByExecutionSequence(
      sequenceActivityIds,
      activitiesForToday,
    );
    const completedActivityIndexInCurrentDaySequence = sortedIdsForCurrentDayActivities.findIndex(
      (e) => e === activity_id,
    );
    const hasCutoffTimeBeenReached = this.hasCutoffTimeBeenReached(cutOffTime, timezone);
    let nextActivity;
    if (hasCutoffTimeBeenReached) {
      const activitiesSortedInSequence = this.sortActivitiesInSequence(activitiesForToday, activity_ids);
      const remainingActivities = activitiesSortedInSequence.slice(completedActivityIndexInCurrentDaySequence + 1);
      const nextHighPriorityActivity = remainingActivities.find(
        (activity) => activity.activity_data.priority === ActivityPriority.HIGH,
      );
      nextActivity = nextHighPriorityActivity ? nextHighPriorityActivity.id : null;
    } else {
      nextActivity = sortedIdsForCurrentDayActivities[completedActivityIndexInCurrentDaySequence + 1];
    }
    const currentActivityIndex = completedActivityIndexInCurrentDaySequence;
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

  getUserTimes(timezone: string, startUp: string, shutDown: string) {
    const userTimeZone = timezone ?? 'UTC';
    const [startupHours, startupMins] = startUp.split(':');
    const [shutdownHours, shutdownMins] = shutDown.split(':');
    const userCurrentTime = DateTime.local({ zone: userTimeZone });
    const userStartupTime = DateTime.local({ zone: userTimeZone }).set({
      hour: Number(startupHours),
      minute: Number(startupMins),
    });
    const userShutdownTime = DateTime.local({ zone: userTimeZone }).set({
      hour: Number(shutdownHours),
      minute: Number(shutdownMins),
    });
    return { userTimeZone, userCurrentTime, userStartupTime, userShutdownTime };
  }

  async recalculateCurrentActivity(partialUser: Partial<User>) {
    const {
      timezone,
      cutoff_time_for_non_high_priority_activities: cutOffTime,
      current_activity,
      current_activity_sequence_id,
      id,
      current_completing_sequence_log_id,
      current_sequence_started_at,
      startup_time,
      shutdown_time,
    } = partialUser;
    const sequence = await this.activitySequenceRepository.orm.findOne({
      where: { id: current_activity_sequence_id },
      relations: ['activities'],
    });
    let currentActivity = current_activity;
    const { userCurrentTime, userStartupTime, userShutdownTime } = this.getUserTimes(
      timezone,
      startup_time,
      shutdown_time,
    );
    const morningRoutineShouldBeCompleted =
      sequence.type === ActivityType.morning && userCurrentTime >= userShutdownTime;
    const eveningRoutineShouldBeCompleted =
      sequence.type === ActivityType.evening &&
      userCurrentTime >= userStartupTime &&
      userCurrentTime < userShutdownTime;

    if (morningRoutineShouldBeCompleted || eveningRoutineShouldBeCompleted) {
      await this.completedActivitySequenceService.completeActivitySequence(current_completing_sequence_log_id, id);
      await this.completedActivitySequenceService.nullifyUserCurrentActivityProps(
        partialUser.id,
        current_activity_sequence_id,
        current_sequence_started_at,
      );
      return { activity: null, shouldRefetchUser: true };
    }
    const hasCutoffTimeBeenReached = this.hasCutoffTimeBeenReached(cutOffTime, timezone);
    if (hasCutoffTimeBeenReached) {
      const currentDay = this.helperCommonService.getDayOfWeek(timezone);
      const { activities, sequenceActivityIds } = sequence;
      const activitiesForToday = this.activitySequenceService.filterActivitiesForCurrentDay(currentDay, activities);
      const sortedIdsForCurrentDayActivities = this.activitySequenceService.sortActivityIdsByExecutionSequence(
        sequenceActivityIds,
        activitiesForToday,
      );
      const currentActivityIndexInCurrentDaySequence = sortedIdsForCurrentDayActivities.findIndex(
        (activityId) => activityId === current_activity.id,
      );
      const activitiesSortedInSequence = this.sortActivitiesInSequence(activitiesForToday, sequenceActivityIds);
      const remainingActivities = activitiesSortedInSequence.slice(currentActivityIndexInCurrentDaySequence);
      const nextHighPriorityActivity = remainingActivities.find(
        (activity) => activity.activity_data.priority === ActivityPriority.HIGH,
      );
      currentActivity = nextHighPriorityActivity ?? null;
      if (!currentActivity) {
        await this.completedActivitySequenceService.completeActivitySequence(current_completing_sequence_log_id, id);
        await this.completedActivitySequenceService.nullifyUserCurrentActivityProps(
          partialUser.id,
          current_activity_sequence_id,
          current_sequence_started_at,
        );
      } else {
        // update user current_activity_id if current activity has changed
        const shouldUpdateUser = current_activity.id !== currentActivity.id;
        if (shouldUpdateUser) {
          await this.userRepository.update(partialUser.id, { current_activity_id: currentActivity?.id ?? null });
        }
      }
    }
    // if sequence was completed, tell activity service to refetch user because multiple fields changed,
    // if not - it's only the activity that's changed and no refetch is needed
    const shouldRefetchUser = current_activity && !currentActivity;
    return { activity: currentActivity, shouldRefetchUser };
  }

  private hasCutoffTimeBeenReached(cutoffTime: string, timezone: string) {
    const hasUserGotCutOffTime = Boolean(cutoffTime);
    const userCurrentTime = DateTime.local({ zone: timezone });
    const userCutOffTime =
      hasUserGotCutOffTime &&
      DateTime.fromFormat(cutoffTime, 'hh:mm', {
        zone: timezone,
      });
    return userCutOffTime && userCurrentTime >= userCutOffTime;
  }

  private sortActivitiesInSequence(activities: Activity[], orderedIds: string[]) {
    return activities.sort(
      (precedingActivity, followingActivity) =>
        orderedIds.indexOf(precedingActivity.id) - orderedIds.indexOf(followingActivity.id),
    );
  }

  private async saveCompletedLog(
    completedActivity: CreateCompletedActivityDto | CreateSkippedActivityDto,
    activity: Activity,
    choice: Activity,
    user_id: string,
    should_not_update_current_activity = false,
    sequenceLog?: CompletedActivitySequence,
  ): Promise<CompletedActivityResponse> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Saving completed log',
      data: {
        user_id,
        activity_id: activity.id,
        choice_id: choice?.id,
        completed_activity_id: completedActivity.activity_id,
      },
    });
    const { choice_id, device_id, note_logged, ...data } = completedActivity;
    const { has_choices } = activity;
    // remove should_not_update_current_activity from completed activity because it doesn't exist in database
    delete data.should_not_update_current_activity;
    delete data.log_quantity_answers;
    const completedItem = new CompletedActivity(
      { ...data, user_id, completed_sequence_id: sequenceLog?.id, activity_note: note_logged },
      { log_quantity: activity.log_quantity, generateId: false },
    );
    const completedChoice = new CompletedActivity(
      { ...data, activity_id: choice?.id, user_id, activity_sequence_id: null, activity_note: note_logged },
      { log_quantity: choice?.log_quantity, generateId: false },
    );
    const nullifiedParent = { quantity_logged: null };
    if (has_choices) Object.assign(completedItem, nullifiedParent);
    let completed_activity_log;
    let completed_choice_log;
    if (should_not_update_current_activity) {
      // create new records if activity is not done as part of sequence
      [completed_activity_log, completed_choice_log] = await Promise.all([
        this.completedActivityRepository.create(completedItem),
        has_choices ? this.completedActivityRepository.create(completedChoice) : null,
      ]);
    } else {
      // upsert completed activity records if activity is part morning or evening routine
      // in case activity gets done for second time one same date
      [completed_activity_log, completed_choice_log] = await Promise.all([
        this.completedActivityRepository.upsert(completedItem, ['activity_id', 'completed_sequence_id']),
        has_choices
          ? this.completedActivityRepository.upsert(completedChoice, ['activity_id', 'completed_sequence_id'])
          : null,
      ]);
    }
    return new CompletedActivityResponse({ completed_activity_log, completed_choice_log });
  }

  private async broadcastCompletionEvent(
    user_id: string,
    completed_activity_id: string,
    completedActivity: CreateCompletedActivityDto,
  ): Promise<void> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Broadcasting completion event to Pusher',
      data: {
        user_id,
        completed_activity_id,
      },
    });
    const pushData = new ActivityCompletedPush(completed_activity_id, { ...completedActivity });
    await this.pusher.trigger(`private-${user_id}`, 'activity-completed', pushData);
  }

  async getStatsByActivityPerDay(
    { activity_id }: GetCompletedActivityStatsParamsDto,
    { days_number, timezone }: GetCompletedActivityStatsQueryDto,
  ): Promise<CompletedActivityStats> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting stats by activity per day',
        data: {
          activity_id,
          days_number,
          timezone,
        },
      });
      const activity = await this.activityRepository.orm.findOneBy({ id: activity_id });
      if (!activity) throw new NotFoundException(`Activity with id: ${activity_id} does not exist!`);
      const { log_summary_type, log_quantity, linked_activity_id } = activity;
      const isActivityCanonicalActivity = !linked_activity_id;
      // if activity is canonical activity, find all copied/linked activities,
      // if activity is linked, find all others that are linked to the same canonical activity
      const linkedActivities = await this.activityRepository.orm.find({
        where: { linked_activity_id: isActivityCanonicalActivity ? activity_id : linked_activity_id },
      });
      const linkedActivitiesIds = linkedActivities.map((linkedActivity) => linkedActivity?.id);
      const idsToFetchStatsFor = [activity_id, linked_activity_id, ...linkedActivitiesIds];
      await this.userSettingsService.updateUserTimezone(activity.user_id, timezone);
      const stat_type = log_quantity ? CompletedActivityStatType.quantity : CompletedActivityStatType.duration;
      const params = { days_number, log_summary_type, stat_type, timezone };
      const items = await this.completedActivityRepository.getAggregatedQuantityLogsPerDay(idsToFetchStatsFor, params);
      const logQuantityQuestions = await this.logQuantityQuestionRepository.orm.find({
        where: { activity_id },
        select: ['id'],
      });
      const loqQuantityQuestionIds = logQuantityQuestions.map((question) => question.id);
      const logQuantityStats = await Promise.all(
        loqQuantityQuestionIds.map(
          (questionId) => this.getStatsByQuestionPerDay(questionId, { days_number, timezone }),
          // eslint-disable-next-line function-paren-newline
        ),
      );
      const stats = new CompletedActivityStats({
        activity_id,
        days_number,
        items,
        log_summary_type,
        stat_type,
        timezone,
        log_quantity_answers_stats: logQuantityStats,
      });
      return stats;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async getStatsByQuestionPerDay(question_id: string, { days_number, timezone }: GetCompletedActivityStatsQueryDto) {
    const question = await this.logQuantityQuestionRepository.orm.findOneBy({ id: question_id });
    if (!question) throw new NotFoundException(`Log quantity question with ID: ${question_id} does not exist!`);
    const { log_summary_type, linked_question_id } = question;
    const isActivityCanonicalActivity = !linked_question_id;
    // if question is canonical question, find all copied/linked questions,
    // if question is linked, find all others that are linked to the same canonical question
    const linkedActivities = await this.logQuantityQuestionRepository.orm.find({
      where: { linked_question_id: isActivityCanonicalActivity ? question_id : linked_question_id },
    });
    const linkedActivitiesIds = linkedActivities.map((linkedActivity) => linkedActivity?.id);
    const idsToFetchStatsFor = [question_id, linked_question_id, ...linkedActivitiesIds];
    const params = { days_number, log_summary_type, timezone };
    const items = await this.logQuantityAnswerRepository.getAggregatedQuantityLogsPerDay(idsToFetchStatsFor, params);
    return new LogQuantityAnswersStats({
      question_id,
      days_number,
      items,
      log_summary_type,
      timezone,
      question,
    });
  }

  async getCompletedLogsByActivityInTimeRange(
    { activity_id }: GetCompletedActivityStatsParamsDto,
    { from_time, to_time },
  ): Promise<CompletedActivity[]> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Getting completed logs by activity in timerange',
      data: {
        activity_id,
        from_time,
        to_time,
      },
    });
    return this.completedActivityRepository.getLogsByActivityInTimeRange(activity_id, { from_time, to_time });
  }

  async getLogQuantityAnswersByQuestionInTimeRange(
    { question_ids }: GetLogQuantityAnswerLogsDto,
    { from_time, to_time },
  ) {
    const answers = await this.logQuantityAnswerRepository.getAnswersByQuestionIdsInTimeRange(
      { question_ids },
      { from_time, to_time },
    );
    const answersObject = {};
    for (const answer of answers) {
      const questionId = answer.question_id;

      if (!(questionId in answersObject)) {
        answersObject[questionId] = [];
      }
      answersObject[questionId].push(answer);
    }
    return answersObject;
  }

  async reviseCompletedLog(
    id: string,
    { quantity_logged, log_quantity_answers }: ReviseCompletedActivityDto,
  ): Promise<CompletedActivity> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Revising completed log',
      data: {
        id,
      },
    });
    let savedLog = {};
    if (typeof quantity_logged !== 'undefined') {
      const log = await this.completedActivityRepository.orm.findOneBy({ id });
      if (!log) throw new NotFoundException(`Completed log with id: ${id} does not exist!`);
      log.quantity_logged = quantity_logged;
      savedLog = await this.completedActivityRepository.orm.save(log);
    }
    let updatedAnswers;
    if (log_quantity_answers?.length) {
      updatedAnswers = await this.reviseLogQuantityAnswers(log_quantity_answers, id);
    }
    return { ...savedLog, answers: updatedAnswers };
  }

  async reviseLogQuantityAnswers(logQuantityAnswers: LogQuantityAnswerDto[], completed_activity_log_id: string) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Revising log quantity question answers',
    });
    const updatedLogs = logQuantityAnswers?.map(async ({ logged_value, question_id }) => {
      const log = await this.logQuantityAnswerRepository.orm.findOneBy({
        question_id,
        completed_activity_log_id,
      });
      log.logged_value = logged_value;
      return this.logQuantityAnswerRepository.orm.save(log);
    });
    return Promise.all(updatedLogs);
  }

  async getDaySummary(user_id: string, timezone: string): Promise<DaySummary> {
    const { isVerboseLoggingAllowed } = await this.userService.isVerboseLoggingAllowed(user_id);
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting day summary',
        data: {
          user_id,
          ...(isVerboseLoggingAllowed && { timezone }),
        },
      });
      const timerange = await this.defineStartupTimestamp(user_id, timezone);
      await this.userSettingsService.updateUserTimezone(user_id, timezone);
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
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  private async defineStartupTimestamp(user_id: string, timezone: string): Promise<any> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Defining startup timestamp',
      data: {
        user_id,
      },
    });
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    const { startup_time } = user;
    if (!startup_time) throw new BadRequestException('The user has no startup_time setting specified!');
    const timerange = this.buildTimestamp(startup_time, timezone);
    return timerange;
  }

  private buildTimestamp(startup_time: string, timeZone: string): { from_time: string; to_time: string } {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Building timestamp',
      data: {
        startup_time,
      },
    });
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
      this.sentryService.instance().captureMessage(JSON.stringify(e), 'error');
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'error',
        message: `Error in buildtimeStamp. to_time: ${to_time}, startupTime: ${startupTime}, from_time: ${from_time}, timezone: ${timeZone}`,
        data: {
          to_time,
          startupTime,
          from_time,
          timeZone,
        },
      });
      throw e;
    }
  }

  private groupByName(items: CompletedActivity[]) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Grouping by name',
    });
    const result = new Map();
    for (const item of items) {
      const existingValue = result.get(item.activity.activity_data.name) ?? [];
      if (existingValue.length < 1) result.set(item.activity.activity_data.name, existingValue);
      existingValue.push(item);
    }
    return Object.fromEntries(result);
  }

  private countSummaryAVG(logs: CompletedActivity[]): ActivityQuantityDaySummaryItem[] {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Counting summary AVG',
    });
    const groupedItems = this.groupByName(logs);
    const entries = Object.entries(groupedItems) as Array<[string, Array<any>]>;
    return entries.map(([name, items]) => {
      const average = items.reduce((acc, { quantity_logged = 0 }) => acc + Number(quantity_logged), 0) / items.length;
      return {
        name,
        quantity: Number(average.toFixed(1)),
      };
    });
  }

  private countSummarySUM(logs: CompletedActivity[]): ActivityQuantityDaySummaryItem[] {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Counting summary SUM',
    });
    const groupedItems = this.groupByName(logs);
    const entries = Object.entries(groupedItems) as Array<[string, Array<any>]>;
    return entries.map(([name, items]) => {
      const sum = items.reduce((acc, { quantity_logged = 0 }) => acc + Number(quantity_logged), 0);
      return {
        name,
        quantity: Number(sum.toFixed(1)),
      };
    });
  }

  private countSummaryDuration(logs: CompletedActivity[]): ActivityDurationDaySummaryItem[] {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Getting summary duration',
    });
    const groupedItems = this.groupByName(logs);
    const entries = Object.entries(groupedItems) as Array<[string, Array<any>]>;
    return entries.map(([name, items]) => ({
      name,
      duration: items.reduce((acc, { duration_logged = 0 }) => acc + Number(duration_logged), 0),
    }));
  }

  private countFocusModeSummary(items: CompletedFocusBlock[]): FocusModeDaySummaryItem[] {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Counting focus mode summary',
    });
    return items.map(({ focus_mode, start_time, finish_time, achievements = '', distractions = '', tags }) => ({
      name: focus_mode.name,
      start_time,
      duration: (new Date(finish_time).getTime() - new Date(start_time).getTime()) / 1000,
      achievements,
      distractions,
      tags: tags?.map((tag) => tag.text),
    }));
  }

  groupActivitiesByDateAndSequence(completedActivities: (CreateCompletedActivityDto | CreateSkippedActivityDto)[]) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Grouping activities by date and sequence',
      });
      const completedActivitiesGroupedByDate = completedActivities.reduce(
        (group: { [key: string]: (CreateCompletedActivityDto | CreateSkippedActivityDto)[] }, activity) => {
          const { start_time } = activity;
          const isValidTime = !Number.isNaN(new Date(start_time).getDate());
          if (!isValidTime) throw new BadRequestException(`Invalid start time: ${start_time}`);
          const startOfDate = new Date(new Date(start_time).setUTCHours(0, 0, 0, 0)).toISOString();
          // eslint-disable-next-line no-param-reassign
          group[startOfDate] ??= [];
          group[startOfDate].push(activity);
          return group;
        },
        {},
      );
      const completedActivitesGroupedByDateAndSequence = Object.entries(completedActivitiesGroupedByDate).map(
        ([, activities]) => {
          return this.groupActivitiesBySequenceId(activities);
        },
      );
      return completedActivitesGroupedByDateAndSequence;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  groupActivitiesBySequenceId(completedActivities: (CreateCompletedActivityDto | CreateSkippedActivityDto)[]): {
    [key: string]: (CreateCompletedActivityDto | CreateSkippedActivityDto)[];
  } {
    try {
      const completedActivitiesGroupedBySequence = completedActivities.reduce((group, activity) => {
        const { activity_sequence_id } = activity;
        // eslint-disable-next-line no-param-reassign
        group[activity_sequence_id] ??= [];
        group[activity_sequence_id].push(activity);
        return group;
      }, {});
      return completedActivitiesGroupedBySequence;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async getCompletedActivityNotes(user_id: string, fetchNotesParams: FetchNotesParamsDto) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching completed activity notes for user',
        data: {
          user_id,
          fetchNotesParams,
        },
      });
      const { activity_id, from_date, to_date, page_num, per_page } = fetchNotesParams;
      if (activity_id) {
        const activity = await this.activityRepository.orm.findOneBy({ id: activity_id });
        if (activity.user_id !== user_id) {
          throw new UnauthorizedException(
            `User with ID: ${user_id} is not is not authorized to access activity with ID: ${activity_id}`,
          );
        }
      }
      const completedActivitiesWithNotes = await this.completedActivityRepository.getNotes(
        user_id,
        activity_id,
        from_date,
        to_date,
        page_num,
        per_page,
      );
      return this.formatNotesResponse(completedActivitiesWithNotes);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  formatNotesResponse(completedActivities: CompletedActivity[]) {
    return completedActivities.map(({ id, start_time, activity_note, activity: { activity_data } }) => {
      return { completed_activity_id: id, date: start_time, activity_name: activity_data.name, note: activity_note };
    });
  }

  async deleteCompletedActivityNotes(user_id: string, completed_activity_ids: string[]) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Deleting completed activity notes',
        data: {
          completed_activity_ids,
        },
      });
      for await (const id of completed_activity_ids) {
        const completedActivityToUpdate = await this.completedActivityRepository.orm.findOneBy({ id });
        if (completedActivityToUpdate.user_id !== user_id) {
          throw new UnauthorizedException(
            `User with ID: ${user_id} is not authorized to delete note belonging to completed activity with ID: ${id}`,
          );
        }
        completedActivityToUpdate.activity_note = null;
        await this.completedActivityRepository.orm.save(completedActivityToUpdate);
      }
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async saveLogQuantityAnswers(
    completedActivity: CompletedActivityResponse,
    logQuantityAnswers: LogQuantityAnswerDto[],
  ) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Saving log quantity question answers',
    });
    const {
      completed_activity_log: { activity_id, user_id, id, start_time },
    } = completedActivity;
    const answers = logQuantityAnswers?.map((answer) => {
      return new LogQuantityAnswer({
        user_id,
        completed_activity_log_id: id,
        activity_id,
        date_logged: start_time,
        ...answer,
      });
    });
    const createdAnswers = this.logQuantityAnswerRepository.orm.create(answers);
    const rawSavedAnswers = await this.logQuantityAnswerRepository.orm.insert(createdAnswers);
    const newRecordIds = rawSavedAnswers.identifiers.map((record: { id: string }) => record.id);
    return this.logQuantityAnswerRepository.orm.find({ where: { id: In(newRecordIds) } });
  }

  async updateCompetencyLevel(activity: Activity, log_quantity_value: number | LogQuantityAnswerDto[]) {
    const choices = await this.activityRepository.orm.find({ where: { parent_id: activity.id } });
    let logQuantityAnswersAvg = 0;
    if (typeof log_quantity_value !== 'number') {
      const totalOfValues = log_quantity_value.reduce(
        (totalLoggedValue, nextLogAnswer) => totalLoggedValue + nextLogAnswer.logged_value,
        0,
      );
      logQuantityAnswersAvg = totalOfValues / log_quantity_value?.length;
    }
    // if old version of log quantity is used, use only single value, else use average of log quantity answers
    const value = typeof log_quantity_value === 'number' ? log_quantity_value : logQuantityAnswersAvg;
    const maxCompetencyLevel = choices?.length;
    const minCurrentLevel = 1;
    let currentCompetencyLevel = activity?.activity_data.current_competency_level ?? 1;
    if (value >= 9) {
      currentCompetencyLevel = Math.min(currentCompetencyLevel + 1, maxCompetencyLevel);
    }
    if (value <= 4) {
      currentCompetencyLevel = Math.max(currentCompetencyLevel - 1, minCurrentLevel);
    }
    // only update current_competency_level if there was a change
    if (activity?.activity_data?.current_competency_level !== currentCompetencyLevel) {
      const updateActivity = { ...activity };
      updateActivity.activity_data.current_competency_level = currentCompetencyLevel;
      await this.activityRepository.orm.save(updateActivity);
    }
  }
}
