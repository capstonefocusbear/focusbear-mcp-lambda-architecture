/* eslint-disable no-console */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { DateTime, IANAZone } from 'luxon';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { PusherService } from '@app/pusher';
import { PusherBeamsService } from '@app/pusher-beams';
import { I18nService } from 'nestjs-i18n';
import {
  UTC_TO_IANA_MAP,
  DEFAULT_IANA_TIMEZONE,
  IDS_TO_LOG_FOR,
  BullQueues,
  BullWorkers,
} from '../../../../shared/utils/constants';
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
import { UserTimesResponse } from '../../domain/user-times-response.model';

@Injectable()
export class CompletedActivityService implements OnModuleInit {
  private redisClient: Redis;

  constructor(
    private readonly completedActivityRepository: CompletedActivityRepository,
    @Inject(forwardRef(() => DeviceService))
    private readonly deviceService: DeviceService,
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    private readonly userRepository: UserRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly completedActivitySequenceService: CompletedActivitySequenceService,
    private readonly pusher: PusherService,
    private readonly pusherBeams: PusherBeamsService,
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
    private readonly i18nService: I18nService,
    @InjectQueue(BullQueues.COMPLETED_ACTIVITY) private completedActivityQueue: Queue,
  ) {
    this.validateRedisEnvironment();
    this.redisClient = new Redis(`redis://${process.env.REDIS_HOSTNAME}:${process.env.REDIS_PORT}`);
  }

  private validateRedisEnvironment(): void {
    if (!process.env.REDIS_HOSTNAME) {
      throw new Error('REDIS_HOSTNAME environment variable is required but not set');
    }
    if (!process.env.REDIS_PORT) {
      throw new Error('REDIS_PORT environment variable is required but not set');
    }
  }

  async onModuleInit() {
    await this.validatePusherConfiguration();
  }

  private async validatePusherConfiguration(): Promise<void> {
    try {
      // Validate Pusher Channels configuration
      if (!this.pusher) {
        throw new Error('Pusher Channels service not available');
      }

      // Validate Pusher Beams configuration
      if (!this.pusherBeams) {
        throw new Error('Pusher Beams service not available');
      }

      console.log('Pusher services initialized successfully:', {
        pusher: !!this.pusher,
        pusherBeams: !!this.pusherBeams,
        timestamp: new Date().toISOString(),
      });

      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'info',
        message: 'Pusher services configuration validated successfully',
        data: {
          pusher_available: !!this.pusher,
          pusher_beams_available: !!this.pusherBeams,
        },
      });
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'error',
        tags: { service: 'pusher', operation: 'configuration_validation' },
        extra: {
          error_message: error.message,
          error_stack: error.stack,
        },
      });

      console.error('Pusher services configuration validation failed:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async completeActivity(
    completedActivity: CreateCompletedActivityDto,
    headers: any,
    { user_id }: GetUserSettingsDto,
  ): Promise<CompletedActivityResponse> {
    // Handle idempotency
    const idempotencyKey = headers['x-idempotency-key'];
    if (idempotencyKey) {
      const cachedResponse = await this.getCachedResponse(idempotencyKey, user_id);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

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
      const startTimeToUse = this.handleStartTime(completedActivity?.start_time, headers);

      const [sequence, activity, user, choice] = await this.fetchPreparatoryData(
        completedActivity.activity_id,
        user_id,
        completedActivity.choice_id,
      );

      if (activity.activity_data?.choice_type === ActivityChoiceType.competency) {
        this.handleCompetencyActivity(activity, completedActivity);
      }

      let logQuantityAnswers: LogQuantityAnswer[] = [];
      let completingSequenceLog = null;
      if (activity.type === ActivityType.break) {
        return await this.handleBreakActivity(
          completedActivity,
          activity,
          choice,
          user_id,
          startTimeToUse,
          user.timezone,
        );
      }

      if (!completedActivity.should_not_update_current_activity) {
        completingSequenceLog = await this.updateUserAndSequence(
          { ...completedActivity, start_time: startTimeToUse },
          { user_id },
          user,
          sequence,
          activity,
          choice,
        );
      }

      const createdItem = await this.saveCompletedLog(
        { ...completedActivity, start_time: startTimeToUse },
        activity,
        choice,
        user_id,
        completedActivity.should_not_update_current_activity,
        completingSequenceLog,
      );

      if (completedActivity.log_quantity_answers?.length > 0) {
        console.log('Log-quantity debug data:', {
          headers,
          completedActivity,
          log_quantity_answers: JSON.stringify(completedActivity.log_quantity_answers),
        });
        logQuantityAnswers = await this.saveLogQuantityAnswers(createdItem, completedActivity.log_quantity_answers);
      }

      await this.handleUpdateDailyStats(
        activity,
        completedActivity.should_not_update_current_activity,
        startTimeToUse,
        user,
        createdItem,
      );

      // Enqueue Pusher broadcasts to background
      await this.completedActivityQueue.add(
        BullWorkers.PROCESS_COMPLETED_ACTIVITY,
        {
          completedActivity,
          user_id,
          completed_activity_log_id: createdItem.completed_activity_log.id,
          completed_choice_log_id: createdItem.completed_choice_log?.id,
          startTimeToUse,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      this.logUserData(choice, user, completedActivity, activity, sequence, completingSequenceLog);

      const response = new CompletedActivityResponse({
        ...createdItem,
        saved_log_quantity_answers: logQuantityAnswers,
      });

      // Cache for idempotency
      if (idempotencyKey) {
        await this.setCachedResponse(idempotencyKey, user_id, response);
      }

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  private async handleUpdateDailyStats(
    activity: Activity,
    should_not_update_current_activity: boolean,
    startTimeToUse: Date,
    user: User,
    createdItem: CompletedActivityResponse,
  ) {
    const isCurrentActivityMorningOrEveningOrBreakType = [
      ActivityType.morning,
      ActivityType.break,
      ActivityType.evening,
    ].includes(activity.type);
    const shouldUpdateDailyStats = !should_not_update_current_activity && isCurrentActivityMorningOrEveningOrBreakType;
    if (shouldUpdateDailyStats) {
      await this.userDailyStatsService.updateDailyStatsRoutineCompletion(
        user.id,
        activity.type,
        createdItem.completed_activity_log.completed_sequence_id,
        startTimeToUse,
        user.timezone,
      );
    }
  }

  private handleStartTime(start_time: Date, headers: any): Date {
    const oneMonthAgo = DateTime.local().minus({ days: 30 }).toJSDate();
    const startTimeAsDate = new Date(start_time);
    let startTimeToUse = start_time;
    // log start time with wrong date to identify which client it's coming from
    // see issue https://github.com/Focus-Bear/backend/issues/469
    if (startTimeAsDate.getTime() < oneMonthAgo.getTime()) {
      // Log client info when fixing invalid start time
      this.sentryService.instance().addBreadcrumb({
        category: 'Client Debug',
        level: 'warning',
        message: 'Fixed invalid start_time from client',
        data: {
          original_start_time: start_time,
          user_agent: headers['user-agent'],
          client_ip: headers['x-forwarded-for'] || headers['x-real-ip'],
        },
      });
      startTimeToUse = new Date();
    }
    return startTimeToUse;
  }

  private logUserData(
    choice: any,
    user: User,
    completedActivity: CreateCompletedActivityDto,
    activity: Activity,
    sequence: ActivitySequence,
    completingSequenceLog: any,
  ) {
    if (IDS_TO_LOG_FOR.includes(user.id)) {
      console.log("User's completed activity data: ", {
        completingSequenceLog,
        completedActivity,
        user,
        activity,
        choice,
        sequence,
      });
    }
  }

  private async handleCompetencyActivity(activity: any, completedActivity: CreateCompletedActivityDto) {
    const { log_quantity_answers } = completedActivity;
    if (activity.activity_data?.choice_type === ActivityChoiceType.competency) {
      if (typeof completedActivity.quantity_logged === 'undefined' && typeof log_quantity_answers === 'undefined') {
        throw new BadRequestException(
          `Competency based activities can't be completed without log_quantity answers or a quantity_logged value. Activity with ID: ${completedActivity.activity_id} is a competency based activity`,
        );
      }
      await this.updateCompetencyLevel(
        activity,
        log_quantity_answers?.length ? log_quantity_answers : completedActivity.quantity_logged,
      );
    }
  }

  private async handleBreakActivity(
    completedActivity: CreateCompletedActivityDto,
    activity: Activity,
    choice: any,
    user_id: string,
    startTimeToUse: Date,
    timeZone: string,
  ): Promise<CompletedActivityResponse> {
    const { device_id, log_quantity_answers, duration_logged } = completedActivity;
    this.validateChoice(activity, choice);
    await this.deviceService.markAsLeader(device_id, user_id);
    const createdItem = await this.saveCompletedLog(
      { ...completedActivity, start_time: startTimeToUse, activity_sequence_id: activity.activity_sequence_id },
      activity,
      choice,
      user_id,
    );
    let logQuantityAnswers = [];
    if (log_quantity_answers?.length > 0) {
      console.log('Log-quantity debug data for break activity:', {
        completedActivity,
        log_quantity_answers: JSON.stringify(completedActivity.log_quantity_answers),
      });
      logQuantityAnswers = await this.saveLogQuantityAnswers(createdItem, log_quantity_answers);
    }
    await this.userDailyStatsService.updateTimeSpentInBreaks(user_id, startTimeToUse, timeZone, duration_logged);
    return new CompletedActivityResponse({ ...createdItem, saved_log_quantity_answers: logQuantityAnswers });
  }

  private handleError(error: any) {
    this.sentryService.instance().captureException(error, { level: 'error' });
    throw error;
  }

  async updateActivityPropsForOfflineSync(
    completedActivities: (CreateCompletedActivityDto | CreateSkippedActivityDto)[],
    user: User,
  ) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating activity props for offline sync',
        data: { user_id: user.id },
      });
      const { startup_time, shutdown_time, timezone } = user;
      const activitiesSortedChronologically = completedActivities;
      activitiesSortedChronologically.sort(
        (precedingActivity, followingActivity) =>
          precedingActivity.start_time.getTime() - followingActivity.start_time.getTime(),
      );
      const latestActivity = activitiesSortedChronologically[activitiesSortedChronologically.length - 1];
      const latestActivityDate = DateTime.fromJSDate(new Date(latestActivity.start_time)).setZone(timezone);
      const latestActivitySequenceId = latestActivity.activity_sequence_id;
      const currentTime = DateTime.local().setZone(timezone);
      // latest activity is from different day, no need to update activity props
      if (!currentTime.hasSame(latestActivityDate, 'day')) return;
      const userSequences = await this.activitySequenceRepository.orm.find({
        where: { user_id: user.id },
        relations: ['activities'],
      });
      const morningSequence = userSequences.find((sequence) => sequence.type === ActivityType.morning);
      const eveningSequence = userSequences.find((sequence) => sequence.type === ActivityType.evening);
      const breakSequenceId = userSequences.find((sequence) => sequence.type === ActivityType.break).id;
      const completedActivitySequence = userSequences.find(
        (sequence) => sequence.id === latestActivity.activity_sequence_id,
      );
      // don't update activity props for break activities
      if (latestActivitySequenceId === breakSequenceId) return;
      const startUpTime = DateTime.fromFormat(startup_time, 'hh:mm', {
        zone: timezone,
      });
      const shutDownTime = DateTime.fromFormat(shutdown_time, 'hh:mm', {
        zone: timezone,
      });
      const isTimeForMorningRoutine = currentTime >= startUpTime && currentTime < shutDownTime;
      const isTimeForEveningRoutine = currentTime >= shutDownTime && currentTime < startUpTime.plus({ days: 1 });
      const completingSequenceLog = await this.getOrCreateCompletingSequenceLog(
        user,
        latestActivitySequenceId,
        latestActivity.start_time,
      );
      const { currentState, nextActivityId } = await this.defineNextCurrentActivity(
        completedActivitySequence,
        latestActivity.activity_id,
        user,
        completingSequenceLog.id,
        latestActivity,
      );
      const isCurrentlyDoingMorningSequence =
        isTimeForMorningRoutine && latestActivitySequenceId === morningSequence.id;
      const isCurrentlyDoingEveningRoutine = isTimeForEveningRoutine && latestActivitySequenceId === eveningSequence.id;
      const current_completing_sequence_log_id = nextActivityId ? completingSequenceLog.id : null;
      if (isCurrentlyDoingMorningSequence || isCurrentlyDoingEveningRoutine) {
        await this.userRepository.orm.update(user.id, {
          ...currentState,
          current_completing_sequence_log_id,
        });
        if (!nextActivityId) {
          await this.completedActivitySequenceService.completeActivitySequence(completingSequenceLog.id, user.id);
        }
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
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
      const failedActivities: (CreateCompletedActivityDto | CreateSkippedActivityDto)[] = [];
      const completedActivitiesWithSequenceIds = await this.addSequenceIdsToCompletedActivities(completedActivities);
      const groupedActivities = this.groupActivitiesByDateAndSequence(completedActivitiesWithSequenceIds);
      const activitySequenceCache = {};
      const activitiesCache = {};
      await Promise.all(
        groupedActivities.map(async (group) => {
          const activitiesGroupedByDateAndSequence = Object.entries(group);
          for await (const [sequenceId, activities] of activitiesGroupedByDateAndSequence) {
            let sequence: ActivitySequence;
            let allActivitiesFromSequence: Activity[];
            if (!Object.keys(activitySequenceCache).includes(sequenceId)) {
              sequence = await this.activitySequenceRepository.orm.findOne({
                where: { id: sequenceId },
                relations: ['activities'],
              });
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
              const wasSaved = await this.syncOfflineActivity({
                completedActivity,
                user,
                allActivitiesFromSequence,
                sequence,
              });
              if (!wasSaved) {
                failedActivities.push(completedActivity);
              }
            }
          }
        }),
      );
      await this.updateActivityPropsForOfflineSync(completedActivities, user);
      return failedActivities;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async syncOfflineActivity({
    completedActivity,
    user,
    allActivitiesFromSequence,
    sequence,
  }: SyncOfflineActivityArgs): Promise<boolean> {
    try {
      const { choice_id, activity_id, log_quantity_answers, metadata, start_time } = completedActivity;
      const completingSequenceLog = await this.getOrCreateCompletingSequenceLog(user, sequence.id, start_time);
      const activity = this.findMatchingActivity(allActivitiesFromSequence, activity_id);

      if (!activity) {
        return false;
      }

      const choice = choice_id ? await this.activityRepository.orm.findOneBy({ id: choice_id }) : null;
      const finish_time = metadata?.skipped_did_complete ? start_time : completedActivity.finish_time;
      const createdItem = await this.saveCompletedLog(
        { ...completedActivity, finish_time },
        activity,
        choice,
        user.id,
        false,
        completingSequenceLog,
      );

      if (log_quantity_answers?.length > 0) {
        console.log('Log-quantity debug data for offline activity:', {
          completedActivity,
          log_quantity_answers: JSON.stringify(completedActivity.log_quantity_answers),
        });
        await this.saveLogQuantityAnswers(createdItem, log_quantity_answers);
      }

      if (activity.activity_data?.choice_type === ActivityChoiceType.competency) {
        const answers = log_quantity_answers?.length ? log_quantity_answers : completedActivity.quantity_logged;
        await this.updateCompetencyLevel(activity, answers);
      }

      await this.handleSequenceCompletion(
        sequence,
        activity_id,
        user,
        completingSequenceLog,
        start_time,
        completedActivity,
      );

      if (activity.type === ActivityType.morning || activity.type === ActivityType.evening) {
        await this.updateDailyStats(user, activity, createdItem, start_time);
      }
      if (activity.type === ActivityType.break) {
        await this.userDailyStatsService.updateTimeSpentInBreaks(
          user.id,
          start_time,
          user.timezone,
          completedActivity.duration_logged,
        );
      }

      return true;
    } catch (error) {
      return this.handleSyncActivityError(error);
    }
  }

  async getOrCreateCompletingSequenceLog(user: User, sequenceId: string, startTime: Date) {
    return this.completedActivitySequenceService.getOrCreateCompletingSequenceLogForSyncing(
      user,
      sequenceId,
      startTime,
    );
  }

  findMatchingActivity(allActivitiesFromSequence: Activity[], activity_id: string) {
    return allActivitiesFromSequence.find((activity) => activity.id === activity_id);
  }

  async handleSequenceCompletion(
    sequence: ActivitySequence,
    activity_id: string,
    user: User,
    completingSequenceLog: any,
    startTime: Date,
    completedActivity: CreateCompletedActivityDto | CreateSkippedActivityDto,
  ) {
    const { nextActivityId } = await this.defineNextCurrentActivity(
      sequence,
      activity_id,
      user,
      completingSequenceLog.id,
      completedActivity,
    );
    const { is_completed } = completingSequenceLog;

    if ((!nextActivityId && !is_completed) || is_completed) {
      await this.completedActivitySequenceService.completeActivitySequenceByDate(
        completingSequenceLog.id,
        user.id,
        startTime,
      );
    }
  }

  async updateDailyStats(user: User, activity: Activity, createdItem: CompletedActivityResponse, startTime: Date) {
    await this.userDailyStatsService.updateDailyStatsRoutineCompletion(
      user.id,
      activity.type,
      createdItem.completed_activity_log.completed_sequence_id,
      startTime,
      user.timezone,
      true,
    );
  }

  handleSyncActivityError(error: Error): boolean {
    console.error('Error syncing offline activity: ', error);
    this.sentryService.instance().captureException(error, { level: 'error' });

    if (
      error?.name.includes('TypeError') ||
      error?.name.includes('RangeError') ||
      error?.name.includes('ReferenceError')
    ) {
      return true;
    }

    return false;
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
      const { activity_id, choice_id } = skippedActivity;
      const [sequence, activity, user, choice] = await this.fetchPreparatoryData(activity_id, user_id, choice_id);
      // Respect client-provided skip reason if present. Default to "did not complete".
      const skippedActivityMetadata = skippedActivity?.metadata ?? { skipped_did_not_complete: true };
      const completingSequenceLog = await this.updateUserAndSequence(
        { ...skippedActivity, metadata: skippedActivityMetadata },
        { user_id },
        user,
        sequence,
        activity,
        choice,
      );
      const createdItem = await this.saveCompletedLog(
        skippedActivity,
        activity,
        choice,
        user_id,
        false,
        completingSequenceLog,
      );
      await this.broadcastCompletionEvent(
        user_id,
        createdItem.completed_activity_log.id,
        { ...skippedActivity },
        activity,
        user.language,
      );
      return createdItem;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
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
    const updatedUser = await this.userRepository.orm.findOne({
      where: { id: user_id },
      relations: ['completing_sequence_log'],
    });
    const { device_id, activity_id, metadata } = activityData;
    const start_time = activityData?.start_time ?? new Date();

    const completingSequenceLog = await this.completedActivitySequenceService.getOrCreateCompletingSequenceLog(
      updatedUser,
      sequence.id,
      start_time,
    );
    const { nextActivityId, currentState } = await this.defineNextCurrentActivity(
      sequence,
      activity_id,
      updatedUser,
      completingSequenceLog.id,
      activityData,
    );

    await this.deviceService.markAsLeader(device_id, user_id);

    const current_completing_sequence_log_id = nextActivityId ? completingSequenceLog.id : null;
    const skippedActivityIds = updatedUser.current_sequence_skipped_activities ?? [];
    if (metadata?.is_skipped || metadata?.skipped_did_not_complete) {
      skippedActivityIds.push(activity_id);
    }

    await this.userRepository.orm.update(user_id, {
      ...currentState,
      current_completing_sequence_log_id,
      current_sequence_skipped_activities: skippedActivityIds.length !== 0 ? skippedActivityIds : null,
      updated_at: new Date().toISOString(),
      has_received_inactivity_warning: false,
    });

    if (!nextActivityId) {
      if (IDS_TO_LOG_FOR.includes(user_id)) {
        console.log('Completing sequence - updateUserAndSequence');
        console.log({ currentState, nextActivityId, activityData });
      }
      await this.completedActivitySequenceService.completeActivitySequence(completingSequenceLog.id, user_id);
    }
    return completingSequenceLog;
  }

  async fetchPreparatoryData(
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
        choice_id,
      },
    });
    const activity = await this.activityRepository.orm.findOneBy({ id: activity_id, user_id });
    if (!activity) throw new NotFoundException(`Activity with id: ${activity_id} does not exist!`);
    const [sequence, user, choice] = await Promise.all([
      this.activitySequenceRepository.orm.findOne({
        where: { id: activity.activity_sequence_id },
        relations: ['activities'],
      }),
      this.userRepository.orm.findOne({ where: { id: user_id }, relations: ['completing_sequence_log'] }),
      choice_id ? this.activityRepository.orm.findOneBy({ id: choice_id }) : null,
    ]);
    if (!sequence) {
      throw new NotFoundException(`Activity Sequence with id: ${activity.activity_sequence_id} does not exist!`);
    }
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
  ): Promise<void> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Validating completing activity',
      data: {
        user_id: user.id,
      },
    });
    const { id, current_activity_sequence_id, current_completing_sequence_log_id, current_activity_assigned_at } = user;
    const isNewCurrentSequence = !current_activity_sequence_id;
    this.validateChoice(activity, choice);
    if (isNewCurrentSequence) return;

    const currentActivityAssignedDate = DateTime.fromJSDate(new Date(current_activity_assigned_at)).setZone(
      user.timezone,
    ).day;
    const userTimes = this.getUserTimesFromPartialUser(user);

    if (this.shouldCompleteRoutine(sequence, userTimes, currentActivityAssignedDate)) {
      if (IDS_TO_LOG_FOR.includes(id)) {
        console.log('Completing user routine from validateCompletingActivity function - shouldCompleteRoutine: TRUE');
      }
      await this.completeRoutineAndNullifyProps(current_completing_sequence_log_id, id, user);
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

  private async defineNextCurrentActivity(
    sequence: ActivitySequence,
    activity_id: string,
    user: User,
    completingSequenceLogId: string,
    completedActivity?: CreateCompletedActivityDto | CreateSkippedActivityDto,
  ): Promise<{
    currentState: CurrentActivityState;
    nextActivityId: string | null | undefined;
  }> {
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

    const completedActivitiesIds = await this.getCurrentSequenceCompletedActivityIds(completingSequenceLogId);
    // add current completed activity ID to completed activity IDs array
    completedActivitiesIds.push(activity_id);

    const currentDay = this.helperCommonService.getDayOfWeek(user.timezone);
    const { sequenceActivityIds, id, activities, activity_ids } = sequence;
    const { timezone, cutoff_time_for_non_high_priority_activities: cutOffTime, startup_time } = user;
    // check if activity exists in entire sequence
    this.activitySequenceService.checkIfActivityExistsInSequence(sequenceActivityIds, activity_id, id);
    const activitiesForToday = this.activitySequenceService.filterActivitiesForCurrentDay(currentDay, activities);
    // temporary variable for debugging
    const idsForTodaysActivities = activitiesForToday.map((activity) => activity.id);
    // sorts the activities for current day in order they should be executed in
    const sortedIdsForCurrentDayActivities = this.activitySequenceService.sortActivityIdsByExecutionSequence(
      sequenceActivityIds,
      activitiesForToday,
    );
    const completedActivityIndexInCurrentDaySequence = sortedIdsForCurrentDayActivities.findIndex(
      (e) => e === activity_id,
    );
    const hasCutoffTimeBeenReached = this.hasCutoffTimeBeenReached(cutOffTime, timezone, startup_time);

    let nextActivityId;
    if (hasCutoffTimeBeenReached) {
      const activitiesSortedInSequence = this.sortActivitiesInSequence(activitiesForToday, activity_ids);

      const highPriorityActivities = activitiesSortedInSequence.filter(
        (activity) => activity.activity_data?.priority === ActivityPriority.HIGH,
      );

      // Find remaining (not completed) high priority activities
      const remainingHighPriorityActivities = highPriorityActivities.filter(
        (activity) => !completedActivitiesIds.includes(activity.id),
      );

      const nextHighPriorityActivity = remainingHighPriorityActivities[0] || null;

      nextActivityId = nextHighPriorityActivity ? nextHighPriorityActivity.id : null;
    } else {
      nextActivityId = this.findNextActivity(completedActivitiesIds, sortedIdsForCurrentDayActivities);
    }
    const isFirstActivity = completedActivitiesIds.length === 1;
    const currentState = new CurrentActivityState(
      {
        nextActivityId,
        lastSequenceId: id,
        isFirstActivity,
      },
      user,
      completedActivity,
    );

    if (IDS_TO_LOG_FOR.includes(user.id) && !nextActivityId) {
      console.log('Data in defineNextCurrentActivity function: ', {
        nextActivityId,
        currentState,
        hasCutoffTimeBeenReached,
        sortedIdsForCurrentDayActivities,
        completedActivityIndexInCurrentDaySequence,
        idsForTodaysActivities,
        currentDay,
      });
    }
    return { nextActivityId, currentState };
  }

  findNextActivity(completedActivities: string[], todaysActivities: string[]) {
    const idsSet = new Set(completedActivities);
    const nextActivityId = todaysActivities.find((id) => !idsSet.has(id));
    return nextActivityId || null;
  }

  getUserTimes(timezone: string, startUp: string, shutDown: string) {
    const userTimeZone = timezone ?? 'UTC';
    const [startupHours, startupMins] = startUp.split(':');
    const [shutdownHours, shutdownMins] = shutDown.split(':');

    const baseTime = DateTime.local({ zone: userTimeZone });
    const userCurrentTime = baseTime;
    const userStartupTime = baseTime.set({
      hour: Number(startupHours),
      minute: Number(startupMins),
    });
    let userShutdownTime = baseTime.set({
      hour: Number(shutdownHours),
      minute: Number(shutdownMins),
    });
    // If shutdown time is before startup time in hh:mm format (meaning it's past midnight), set it to be following day
    if (userShutdownTime < userStartupTime) {
      userShutdownTime = userShutdownTime.plus({ days: 1 });
    }
    return { userTimeZone, userCurrentTime, userStartupTime, userShutdownTime };
  }

  // Determines if the current time is still within the user's day (from startup to shutdown)
  // even if the calendar date has changed. This handles cases where shutdown time is after midnight.
  private isWithinUserDay(
    activityAssignedDate: number,
    currentDate: number,
    currentTime: DateTime,
    startupTime: DateTime,
    shutdownTime: DateTime,
  ): boolean {
    // Check if shutdown time is after midnight (next day)
    const shutdownIsNextDay = shutdownTime.day > startupTime.day;

    if (!shutdownIsNextDay) {
      // Normal case: shutdown is same day as startup
      return currentDate === activityAssignedDate;
    }

    // Shutdown is after midnight case
    if (currentDate === activityAssignedDate) {
      // Still on the same calendar day as when activity was assigned
      return true;
    }

    if (currentDate === activityAssignedDate + 1) {
      // We're on the next calendar day
      // Check if we're before the shutdown time
      return currentTime < shutdownTime;
    }

    // We're beyond the user's day
    return false;
  }

  async recalculateCurrentActivity(partialUser: Partial<User>) {
    const {
      id,
      current_activity_sequence_id,
      current_activity,
      current_completing_sequence_log_id,
      current_activity_assigned_at,
    } = partialUser;

    const sequence = await this.fetchActivitySequence(current_activity_sequence_id);
    const currentActivityAssignedDate = current_activity_assigned_at
      ? DateTime.fromJSDate(current_activity_assigned_at).setZone(partialUser.timezone).day
      : undefined;
    const userTimes = this.getUserTimesFromPartialUser(partialUser);

    if (this.shouldCompleteRoutine(sequence, userTimes, currentActivityAssignedDate)) {
      if (IDS_TO_LOG_FOR.includes(id)) {
        console.log('Completing user routine from recalculateCurrentActivity function - shouldCompleteRoutine: TRUE');
        console.log({ current_activity_assigned_at });
      }
      await this.completeRoutineAndNullifyProps(current_completing_sequence_log_id, id, partialUser);
      return { activity: null, shouldRefetchUser: true };
    }

    if (this.isCutoffTimeReached(partialUser)) {
      console.log('Completing user routine from recalculateCurrentActivity function - isCutoffTimeReached: TRUE');
      return this.handleActivitiesAfterCutoffTime(partialUser, sequence);
    }

    if (IDS_TO_LOG_FOR.includes(id)) {
      console.log('Log data - recalculateCurrentActivity - no change in current activity');
    }

    return {
      activity: current_activity,
      shouldRefetchUser: false,
    };
  }

  async fetchActivitySequence(current_activity_sequence_id: string) {
    return this.activitySequenceRepository.orm.findOne({
      where: { id: current_activity_sequence_id },
      relations: ['activities'],
    });
  }

  getUserTimesFromPartialUser(partialUser: Partial<User>) {
    const { timezone, startup_time, shutdown_time } = partialUser;
    return this.getUserTimes(timezone, startup_time, shutdown_time);
  }

  shouldCompleteRoutine(
    sequence: ActivitySequence,
    { userCurrentTime, userShutdownTime, userStartupTime }: UserTimesResponse,
    currentActivityAssignedDate: number | undefined,
  ): boolean {
    const userCurrentDate = userCurrentTime.day;

    // If no assigned date, we can't determine if routine should be completed
    if (currentActivityAssignedDate === undefined) {
      return false;
    }

    // For users with shutdown time after midnight, we need to check if we're still within
    // the same "user day" (from startup to shutdown) even if calendar date has changed
    const isWithinUserDay = this.isWithinUserDay(
      currentActivityAssignedDate,
      userCurrentDate,
      userCurrentTime,
      userStartupTime,
      userShutdownTime,
    );

    // Check if we need to switch routine types (morning to evening or vice versa)
    if (isWithinUserDay) {
      // If it's a morning routine and we're past shutdown time (evening), complete it
      if (sequence.type === ActivityType.morning && userCurrentTime >= userShutdownTime) {
        return true;
      }
      // If it's an evening routine and we're before shutdown time but in morning period, complete it
      if (
        sequence.type === ActivityType.evening &&
        userCurrentTime < userShutdownTime &&
        userCurrentTime >= userStartupTime
      ) {
        return true;
      }
      return false;
    }

    // If the routine is more than 1 day old, always force complete it
    const daysDifference = userCurrentDate - currentActivityAssignedDate;
    if (Math.abs(daysDifference) > 1) {
      return true;
    }

    // Morning routine completion conditions
    const isMorningRoutine = sequence.type === ActivityType.morning;
    const isRoutineFromYesterday = daysDifference === 1;
    const hasNewDayBegunForMorningRoutine = isMorningRoutine && isRoutineFromYesterday;

    const isCurrentDayMorningRoutine = isMorningRoutine && daysDifference === 0;
    const isPastShutdownTime = userCurrentTime >= userShutdownTime;
    const shouldCompleteTodaysMorningRoutine = isCurrentDayMorningRoutine && isPastShutdownTime;

    // Evening routine completion conditions
    const isEveningRoutine = sequence.type === ActivityType.evening;
    const isWithinMorningHours = userCurrentTime >= userStartupTime && userCurrentTime < userShutdownTime;
    const shouldCompleteEveningRoutine = isEveningRoutine && isWithinMorningHours;

    const shouldComplete =
      hasNewDayBegunForMorningRoutine || shouldCompleteTodaysMorningRoutine || shouldCompleteEveningRoutine;

    return shouldComplete;
  }

  async completeRoutineAndNullifyProps(
    current_completing_sequence_log_id: string,
    id: string,
    partialUser: Partial<User>,
  ) {
    // Inspect current sequence log to decide whether we should mark it completed
    const seqLog = await this.completedActivitySequenceService.getUncompletedSequenceLogWithActivities(
      current_completing_sequence_log_id,
    );

    if (!seqLog) {
      // Fallback to legacy behavior if we can't load the log: finalize & clear
      await this.completedActivitySequenceService.completeActivitySequence(current_completing_sequence_log_id, id);
      await this.completedActivitySequenceService.nullifyUserCurrentActivityProps(
        partialUser.id,
        partialUser.current_activity_sequence_id,
        partialUser.current_sequence_started_at,
      );
      return;
    }

    // Treat "skipped_did_complete" as a completed habit (counts toward routine completion)
    const hasNonSkippedLogs = (seqLog?.completed_activity_logs || []).some((log) => {
      const m = log?.metadata || {};
      const countsAsCompletion = m.skipped_did_complete === true || !(m.is_skipped || m.skipped_did_not_complete);
      return countsAsCompletion;
    });

    if (!hasNonSkippedLogs) {
      // No completed habits: clear pointers but do NOT mark as completed
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'info',
        message: 'Avoiding auto-completion: zero completed habits in sequence',
        data: {
          user_id: id,
          current_completing_sequence_log_id,
          current_sequence_id: partialUser.current_activity_sequence_id,
        },
      });
      await this.completedActivitySequenceService.clearUserCurrentActivityPropsWithoutCompletion(id);
      return;
    }

    // At least one completed habit (or did already) → finalize as completed
    await this.completedActivitySequenceService.completeActivitySequence(current_completing_sequence_log_id, id);
    await this.completedActivitySequenceService.nullifyUserCurrentActivityProps(
      partialUser.id,
      partialUser.current_activity_sequence_id,
      partialUser.current_sequence_started_at,
    );
  }

  isCutoffTimeReached(partialUser: Partial<User>): boolean {
    const { cutoff_time_for_non_high_priority_activities: cutOffTime, timezone, startup_time } = partialUser;
    return this.hasCutoffTimeBeenReached(cutOffTime, timezone, startup_time);
  }

  async handleActivitiesAfterCutoffTime(partialUser: Partial<User>, sequence: ActivitySequence) {
    const { id, current_activity, current_completing_sequence_log_id } = partialUser;

    const completedActivitiesIds = await this.getCurrentSequenceCompletedActivityIds(
      current_completing_sequence_log_id,
    );
    const currentDay = this.helperCommonService.getDayOfWeek(partialUser.timezone);

    const activitiesForToday = this.activitySequenceService.filterActivitiesForCurrentDay(
      currentDay,
      sequence.activities,
    );
    const activitiesSortedInSequence = this.sortActivitiesInSequence(activitiesForToday, sequence.activity_ids);
    const highPriorityActivities = activitiesSortedInSequence.filter(
      (activity) => activity.activity_data?.priority === ActivityPriority.HIGH,
    );
    const remainingHighPriorityActivities = highPriorityActivities.filter(
      (activity) => !completedActivitiesIds.includes(activity.id),
    );
    const nextHighPriorityActivity = remainingHighPriorityActivities[0] || null;

    if (!nextHighPriorityActivity) {
      await this.completeRoutineAndNullifyProps(current_completing_sequence_log_id, id, partialUser);
      return { activity: null, shouldRefetchUser: true };
    }

    if (current_activity.id !== nextHighPriorityActivity.id) {
      await this.userRepository.update(partialUser.id, {
        current_activity_id: nextHighPriorityActivity.id,
        updated_at: new Date().toISOString(),
        has_received_inactivity_warning: false,
      });
    }

    if (IDS_TO_LOG_FOR.includes(partialUser.id)) {
      console.log('Log data - handleActivitiesAfterCutoffTime triggered');
      console.log({ nextHighPriorityActivity });
    }

    const shouldRefetchUser = current_activity !== nextHighPriorityActivity;

    return { activity: nextHighPriorityActivity, shouldRefetchUser };
  }

  filterRemainingActivities(activitiesForToday: Activity[], completedActivitiesIds: string[]) {
    return activitiesForToday.filter((activity) => !completedActivitiesIds.includes(activity.id));
  }

  findNextHighPriorityActivity(remainingActivities: Activity[]) {
    return remainingActivities.find((activity) => activity.activity_data.priority === ActivityPriority.HIGH);
  }

  private hasCutoffTimeBeenReached(cutoffTime: string, timezone: string, startupTime: string): boolean {
    if (!cutoffTime) return false;

    const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);
    const [startupHour] = startupTime.split(':').map(Number);

    // Get current time in the user's zone
    const now = DateTime.local({ zone: timezone });
    let cutOff = now.set({ hour: cutoffHour, minute: cutoffMinute, second: 0 });

    // If cut-off is before day-start and we are past startup, treat it as tomorrow's cut-off
    if (cutoffHour < startupHour && now.hour >= startupHour) {
      cutOff = cutOff.plus({ days: 1 });
    }

    return now >= cutOff;
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
      {
        ...data,
        user_id,
        activity_sequence_id: sequenceLog?.activity_sequence_id ?? data.activity_sequence_id,
        completed_sequence_id: sequenceLog?.id,
        activity_note: note_logged,
      },
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
        this.completedActivityRepository.upsertActivity(completedItem),
        has_choices ? this.completedActivityRepository.upsertActivity(completedChoice) : null,
      ]);
    }
    return new CompletedActivityResponse({ completed_activity_log, completed_choice_log });
  }

  async broadcastCompletionEvent(
    user_id: string,
    completed_activity_id: string,
    completedActivity: CreateCompletedActivityDto | CreateSkippedActivityDto,
    activity: Activity,
    language: string,
  ): Promise<void> {
    const { isVerboseLoggingAllowed } = await this.userService.isVerboseLoggingAllowed(user_id);

    if (isVerboseLoggingAllowed) {
      console.log('Broadcasting completion event for user:', {
        user_id,
        completed_activity_id,
        activity_id: activity.id,
        activity_name: activity.activity_data.name,
        language,
        timestamp: new Date().toISOString(),
      });
    }

    const pushData = new ActivityCompletedPush(completed_activity_id, { ...completedActivity });

    // Pusher Channels broadcast with error handling
    try {
      if (isVerboseLoggingAllowed) {
        console.log('Triggering Pusher Channels event:', {
          channel: `private-${user_id}`,
          event: 'activity-completed',
          pushData,
        });
      }

      await this.pusher.trigger(`private-${user_id}`, 'activity-completed', pushData);

      if (isVerboseLoggingAllowed) {
        console.log('Pusher Channels trigger successful for user:', user_id);
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'error',
        tags: { service: 'pusher-channels', operation: 'trigger' },
        extra: {
          user_id,
          channel: `private-${user_id}`,
          event: 'activity-completed',
          pushData,
          error_message: error.message,
          error_stack: error.stack,
        },
      });

      if (isVerboseLoggingAllowed) {
        console.error('Pusher Channels trigger failed:', {
          user_id,
          error: error.message,
          stack: error.stack,
          channel: `private-${user_id}`,
          event: 'activity-completed',
        });
      }
    }

    // Pusher Beams notification with error handling
    try {
      const title = this.i18nService.t('common.activity_completed', { lang: language });
      const body = this.i18nService.t('common.activity_completed_message', {
        lang: language,
        args: { activity_name: activity.activity_data.name },
      });

      const publishRequest = this.pusherBeams.createBeamsPublishRequest({
        title,
        body,
        pushData,
        should_send_only_data_for_android: true,
      });

      if (isVerboseLoggingAllowed) {
        console.log('Publishing Pusher Beams notification:', {
          user_id,
          title,
          body,
          publishRequest: JSON.stringify(publishRequest),
        });
      }

      console.log('Beams Request for debugging: ', JSON.stringify(publishRequest));
      await this.pusherBeams.publishToUsers([user_id], publishRequest);

      if (isVerboseLoggingAllowed) {
        console.log('Pusher Beams notification published successfully for user:', user_id);
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'error',
        tags: { service: 'pusher-beams', operation: 'publishToUsers' },
        extra: {
          user_id,
          title: this.i18nService.t('common.activity_completed', { lang: language }),
          body: this.i18nService.t('common.activity_completed_message', {
            lang: language,
            args: { activity_name: activity.activity_data.name },
          }),
          pushData,
          error_message: error.message,
          error_stack: error.stack,
        },
      });

      if (isVerboseLoggingAllowed) {
        console.error('Pusher Beams notification failed:', {
          user_id,
          error: error.message,
          stack: error.stack,
          activity_name: activity.activity_data.name,
        });
      }
    }

    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Broadcasting completion event to Pusher completed',
      data: {
        user_id,
        pushData,
        activity_name: activity.activity_data.name,
      },
    });
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
      await this.userSettingsService.updateUserTimezoneAndLanguage(activity.user_id, { timezone });
      const zone = this.convertUtcToIana(timezone);
      const stat_type = log_quantity ? CompletedActivityStatType.quantity : CompletedActivityStatType.duration;
      const params = { days_number, log_summary_type, stat_type, timezone: zone };
      const items = await this.completedActivityRepository.getAggregatedQuantityLogsPerDay(idsToFetchStatsFor, params);
      const logQuantityQuestions = await this.logQuantityQuestionRepository.orm.find({
        where: { activity_id },
        select: ['id'],
      });
      const loqQuantityQuestionIds = logQuantityQuestions.map((question) => question.id);
      const logQuantityStats = await Promise.all(
        loqQuantityQuestionIds.map(
          (questionId) => this.getStatsByQuestionPerDay(questionId, { days_number, timezone: zone }),
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
      this.sentryService.instance().captureException(error, { level: 'error' });
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
    const updatedLogs = logQuantityAnswers
      ?.map(async ({ logged_value, question_id }) => {
        const log = await this.logQuantityAnswerRepository.orm.findOneBy({
          question_id,
          completed_activity_log_id,
        });
        if (!log) return;
        log.logged_value = logged_value;
        return this.logQuantityAnswerRepository.orm.save(log);
      })
      .filter(Boolean);
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
      await this.userSettingsService.updateUserTimezoneAndLanguage(user_id, { timezone });
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
      this.sentryService.instance().captureException(error, { level: 'error' });
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
      this.sentryService.instance().captureException(JSON.stringify(e), { level: 'error' });
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
    const entries: Array<[string, Array<any>]> = Object.entries(groupedItems);
    return entries.map(([name, items]) => {
      const average =
        items.reduce((acc, { quantity_logged = 0, answers }) => {
          // use value of log quantity answer if any
          if (answers?.length) {
            return acc + (answers[0]?.logged_value ?? 0);
          }
          return acc + Number(quantity_logged);
        }, 0) / items.length;
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
    const entries: Array<[string, Array<any>]> = Object.entries(groupedItems);
    return entries.map(([name, items]) => {
      const sum = items.reduce((acc, { quantity_logged = 0, answers }) => {
        // use value of log quantity answer if any
        if (answers?.length) {
          return acc + (answers[0]?.logged_value ?? 0);
        }
        return acc + Number(quantity_logged);
      }, 0);
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
    const entries: Array<[string, Array<any>]> = Object.entries(groupedItems);
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
    return items.map(
      ({ focus_mode, start_time, finish_time, achievements = '', distractions = '', tags, metadata }) => ({
        name: focus_mode.name,
        start_time,
        duration: (new Date(finish_time).getTime() - new Date(start_time).getTime()) / 1000,
        achievements,
        distractions,
        tags: tags?.map((tag) => tag.text),
        metadata: metadata || {},
      }),
    );
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
      this.sentryService.instance().captureException(error, { level: 'error' });
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
      this.sentryService.instance().captureException(error, { level: 'error' });
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
      this.sentryService.instance().captureException(error, { level: 'error' });
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
        if (!completedActivityToUpdate) {
          throw new NotFoundException(`Completed activity with ID: ${id} not found`);
        }
        if (completedActivityToUpdate.user_id !== user_id) {
          throw new UnauthorizedException(
            `User with ID: ${user_id} is not authorized to delete note belonging to completed activity with ID: ${id}`,
          );
        }
        completedActivityToUpdate.activity_note = null;
        await this.completedActivityRepository.orm.save(completedActivityToUpdate);
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
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

  convertUtcToIana(timezone: string) {
    // if the input is already in IANA format, just return it
    if (IANAZone.isValidZone(timezone) && !Object.keys(UTC_TO_IANA_MAP).includes(timezone)) {
      return timezone;
    }
    // get UTC offset
    const offset = timezone.match(/([+\\-]\d{2}:\d{2})/g);
    if (!offset) {
      throw new Error('Invalid timezone format');
    }
    const iana = UTC_TO_IANA_MAP[offset[0]];
    if (!iana) {
      return DEFAULT_IANA_TIMEZONE;
    }
    return iana;
  }

  async getCurrentSequenceCompletedActivityIds(currentCompletingSequenceLogId: string) {
    const completedActivities = await this.completedActivityRepository.orm.find({
      where: { completed_sequence_id: currentCompletingSequenceLogId },
    });
    return completedActivities?.map((completedActivity) => completedActivity.activity_id) || [];
  }

  findActivitySequenceId(activityId: string, activities: Activity[]) {
    const matchingActivity = activities.find((activity) => activity.id === activityId);
    return matchingActivity.activity_sequence_id;
  }

  async addSequenceIdsToCompletedActivities(
    completedActivities: (CreateCompletedActivityDto | CreateSkippedActivityDto)[],
  ): Promise<(CreateCompletedActivityDto | CreateSkippedActivityDto)[]> {
    const completedActivityIds = completedActivities.map((completedActivity) => completedActivity.activity_id);
    const activitiesFromDB = await this.activityRepository.orm.find({ where: { id: In(completedActivityIds) } });
    // filter out activities that could have been deleted
    const existingCompletedActivities = completedActivities.filter((completedActivity) => {
      const matchingActivity = activitiesFromDB.find((activity) => activity.id === completedActivity.activity_id);
      return matchingActivity !== undefined;
    });
    const activitiesWithSequenceIds = existingCompletedActivities.map((completedActivity) => {
      return {
        ...completedActivity,
        activity_sequence_id: this.findActivitySequenceId(completedActivity.activity_id, activitiesFromDB),
      };
    });
    return activitiesWithSequenceIds;
  }

  private async getCachedResponse(idempotencyKey: string, user_id: string): Promise<CompletedActivityResponse | null> {
    try {
      const cacheKey = `idempotency:${user_id}:${idempotencyKey}`;
      const cached = await this.redisClient.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'error',
        tags: { service: 'redis', operation: 'get_cached_response' },
        extra: { idempotencyKey, user_id, error_message: error.message },
      });
      return null;
    }
  }

  private async setCachedResponse(
    idempotencyKey: string,
    user_id: string,
    response: CompletedActivityResponse,
  ): Promise<void> {
    try {
      // Cache for 24 hours (86400 seconds)
      const cacheKey = `idempotency:${user_id}:${idempotencyKey}`;
      await this.redisClient.setex(cacheKey, 86400, JSON.stringify(response));
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'error',
        tags: { service: 'redis', operation: 'set_cached_response' },
        extra: { idempotencyKey, user_id, error_message: error.message },
      });
    }
  }
}
