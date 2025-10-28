import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { DateTime } from 'luxon';
import { PusherService } from '@app/pusher';
import { PusherBeamsService } from '@app/pusher-beams';
import { In } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { User } from '../../../user/entities/user.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { UserDailyStatsService } from '../../../user/services/user-daily-stats/user-daily-stats.service';
import { CurrentFocusModeData } from '../../domain/current-focus-mode-data.model';
import { FinishFocusModeDto } from '../../dto/finish-focus-mode.dto';
import { GetFocusModeParamsDto } from '../../dto/get-focus-mode-params.dto';
import { StartFocusModeDto } from '../../dto/start-focus-mode.dto';
import { CompletedFocusBlock } from '../../entities/completed-focus-block.entity';
import { FocusMode } from '../../entities/focus-mode.entity';
import { CompletedFocusBlockRepository } from '../../repositories/completed-focus-block.repository';
import { FocusModeRepository } from '../../repositories/focus-mode.repository';
import { FocusModeService } from '../focus-mode/focus-mode.service';
import { ToDoRepository } from '../../../to-do/repositories/to-do.repository';
import { ToDoService } from '../../../to-do/services/to-do.service';
import { UpdateScheduledFinishDto } from '../../dto/update-scheduled-finish-time.dto';
import { UserService } from '../../../user/services/user/user.service';

@Injectable()
export class FocusModeManagerService {
  constructor(
    private readonly focusModeRepository: FocusModeRepository,
    private readonly completedFocusBlockRepository: CompletedFocusBlockRepository,
    private readonly userRepository: UserRepository,
    private readonly pusher: PusherService,
    private readonly pusherBeamsService: PusherBeamsService,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly userDailyStatsService: UserDailyStatsService,
    private readonly focusModeService: FocusModeService,
    private readonly toDoRepository: ToDoRepository,
    private readonly toDoService: ToDoService,
    private readonly i18nService: I18nService,
    private readonly userService: UserService,
  ) {}

  async startCurrentFocusMode(
    { finish_time, intention, start_time, to_dos }: StartFocusModeDto,
    { focus_mode_id }: GetFocusModeParamsDto,
    user_id: string,
    headers: any,
  ): Promise<void> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Starting focus mode',
        data: {
          finish_time,
          start_time,
          focus_mode_id,
        },
      });
      let device_id = null;
      if (headers?.device_id) {
        device_id = headers.device_id;
      }
      // using incoming focus mode's starting time for possible incomplete mode's finish time
      // by passing start_time here for finish_time argument of validateStartingFocusMode
      const [{ name }, { language }] = await this.validateStartingFocusMode(
        focus_mode_id,
        user_id,
        start_time,
        headers,
      );
      const scheduled_finish_time = finish_time;
      const toDoIds = to_dos?.map((todo) => todo.id);
      let toDosToLink = [];
      if (toDoIds?.length) {
        toDosToLink = await this.toDoRepository.orm.find({ where: { user_id, id: In(toDoIds) } });
      }
      const completedFocusBlock = new CompletedFocusBlock({
        start_time,
        scheduled_finish_time,
        intention,
        user_id,
        focus_mode_id,
        to_dos: toDosToLink,
      });
      const completedMode = await this.completedFocusBlockRepository.orm.save(completedFocusBlock);
      const completed_mode_id = completedMode.id;
      const userDataToUpdate = new CurrentFocusModeData({ finish_time, focus_mode_id, completed_mode_id });
      const pushNotificationTitle = this.i18nService.t('common.focus_mode_started', {
        lang: language,
      });
      const pushNotificationBody = this.i18nService.t('common.focus_mode_started_message', {
        lang: language,
        args: { focus_mode_name: name },
      });
      const notificationData = { ...completedMode, device_id };
      const publishRequest = this.pusherBeamsService.createBeamsPublishRequest({
        title: pushNotificationTitle,
        body: pushNotificationBody,
        pushData: notificationData,
      });
      await this.userRepository.orm.update(user_id, userDataToUpdate);
      // Pusher throwing error about data exceeding size limit, removing to dos
      delete notificationData?.to_dos;
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Sending start focus mode notification with Pusher',
        data: { user_id, notificationData },
      });
      await this.pusher.trigger(`private-${user_id}`, 'focus-mode-started', notificationData);

      // Verbose logging for push notification
      await this.userService.logVerboselyIfUserHasVerboseLoggingEnabled(user_id, () => {
        // eslint-disable-next-line no-console
        console.log('Publishing Pusher Beams notification for focus mode start (verbose logging enabled):', {
          user_id,
          title: pushNotificationTitle,
          body: pushNotificationBody,
          notificationData,
          publishRequest: JSON.stringify(publishRequest),
        });
      });

      // eslint-disable-next-line no-console
      console.log('Beams Request for debugging: ', JSON.stringify(publishRequest));

      try {
        await this.pusherBeamsService.publishToUsers([user_id], publishRequest);

        await this.userService.logVerboselyIfUserHasVerboseLoggingEnabled(user_id, () => {
          // eslint-disable-next-line no-console
          console.log('Pusher Beams notification published successfully for focus mode start:', user_id);
        });
      } catch (error) {
        await this.userService.logVerboselyIfUserHasVerboseLoggingEnabled(user_id, () => {
          // eslint-disable-next-line no-console
          console.error('Pusher Beams notification failed for focus mode start:', {
            user_id,
            error: error.message,
            stack: error.stack,
            focus_mode_name: name,
          });
        });
        throw error;
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private async validateStartingFocusMode(
    focus_mode_id: string,
    user_id: string,
    finish_time: Date,
    headers: any,
  ): Promise<[FocusMode, User]> | never {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Validating starting focus mode',
      data: {
        user_id,
        focus_mode_id,
      },
    });
    const [focusMode, user] = await this.fetchFocusModeAndUser(focus_mode_id, user_id);
    const notFoundModeMsg = `Focus Mode with id: ${focus_mode_id} does not exist for User with id: ${user_id}!`;
    if (!focusMode) throw new NotFoundException(notFoundModeMsg);
    const hasUserCurrentMode = Boolean(user.current_focus_mode_id);
    const isForcefullyFinishing = true;
    if (hasUserCurrentMode) {
      const hasCurrentFocusModeBeenDeleted = await this.checkFocusModeDeleted(user.current_focus_mode_id);
      if (hasCurrentFocusModeBeenDeleted) {
        await this.nullifyCurrentFocusModeForUser(user_id);
      } else {
        await this.finishCurrentFocusMode(
          { finish_time },
          { focus_mode_id: user.current_focus_mode_id },
          user.id,
          headers,
          isForcefullyFinishing,
        );
      }
    }
    return [focusMode, user];
  }

  async checkFocusModeDeleted(focusModeId: string) {
    const focusMode = await this.focusModeRepository.orm.findOne({ where: { id: focusModeId } });
    return !focusMode;
  }

  private async fetchFocusModeAndUser(focus_mode_id: string, user_id: string): Promise<[FocusMode, User]> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Fetching focus mode and user',
      data: {
        user_id,
        focus_mode_id,
      },
    });
    return Promise.all([
      this.focusModeRepository.findOneByIdForUser(focus_mode_id, user_id),
      this.userRepository.orm.findOneBy({ id: user_id }),
    ]);
  }

  async finishCurrentFocusMode(
    finishFocusBlockDto: FinishFocusModeDto,
    { focus_mode_id }: GetFocusModeParamsDto,
    user_id: string,
    headers: any,
    isForcefullyFinishing = false,
  ): Promise<void> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Finishing current focus mode',
        data: { focus_mode_id, user_id },
      });
      let device_id = null;
      if (headers?.device_id) {
        device_id = headers.device_id;
      }
      const { finish_time, focus_duration_seconds, tags, to_dos } = finishFocusBlockDto;

      const user = await this.validateFinishingFocusMode(focus_mode_id, user_id);

      const completingFocusBlock = await this.completedFocusBlockRepository.orm.findOneBy({
        id: user.current_completing_focus_block_id,
      });
      if (!completingFocusBlock) {
        throw new NotFoundException('Completing focus block not found');
      }

      const { intention, start_time, scheduled_finish_time } = completingFocusBlock;

      await this.toDoService.logToDosTime(to_dos, user_id, completingFocusBlock.id);

      // duration calculation + cap
      const clientFinish = finish_time ?? new Date();

      // Effective finish cannot exceed scheduled_finish_time (if present)
      const effectiveFinish =
        scheduled_finish_time && clientFinish > scheduled_finish_time ? scheduled_finish_time : clientFinish;

      const serverComputedSecs = this.calculateFocusDurationSeconds(start_time, effectiveFinish);

      const finalDurationSecs =
        typeof focus_duration_seconds === 'number'
          ? Math.max(0, Math.min(focus_duration_seconds, serverComputedSecs))
          : serverComputedSecs;

      let focusModeTags = [];
      if (tags?.length) {
        focusModeTags = await this.focusModeService.saveFocusModeTags(user_id, tags);
      }

      const updateCompletingFocusBlock = {
        ...completingFocusBlock,
        ...finishFocusBlockDto,
        to_dos: completingFocusBlock?.to_dos,
        finish_time: effectiveFinish,
        focus_duration_seconds: finalDurationSecs,
        tags: focusModeTags,
      };

      const [, completedMode] = await Promise.all([
        this.nullifyCurrentFocusModeForUser(user_id),
        this.completedFocusBlockRepository.orm.save(updateCompletingFocusBlock),
      ]);

      if (!isForcefullyFinishing) {
        await this.sendFinishFocusModeNotification({
          user_id,
          language: user.language,
          device_id,
          completedMode,
          intention,
        });
      }

      await this.userDailyStatsService.updateDailyStatsFocusModesCompleted(
        user_id,
        effectiveFinish,
        user.timezone,
        finalDurationSecs,
      );

      await this.userRepository.update(user.id, {
        last_completed_focus_mode_at: DateTime.local({ zone: 'UTC' }).toJSDate(),
        updated_at: new Date().toISOString(),
        has_received_inactivity_warning: false,
      });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async sendFinishFocusModeNotification({
    user_id,
    language,
    completedMode,
    intention,
    device_id,
  }: {
    user_id: string;
    language: string;
    completedMode: CompletedFocusBlock;
    intention: string;
    device_id: string;
  }) {
    const pushNotificationTitle = this.i18nService.t('common.focus_mode_completed', {
      lang: language,
    });
    const pushNotificationBody = this.i18nService.t('common.focus_mode_completed_message', {
      lang: language,
      args: { intention },
    });
    const notificationData = { ...completedMode, device_id };
    const publishRequest = this.pusherBeamsService.createBeamsPublishRequest({
      title: pushNotificationTitle,
      body: pushNotificationBody,
      pushData: notificationData,
    });
    // Pusher throws error about data exceeding size limit, removing to dto's
    delete notificationData?.to_dos;
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Sending finish focus mode notification with Pusher',
      data: { user_id, notificationData },
    });
    await this.pusher.trigger(`private-${user_id}`, 'focus-mode-finished', notificationData);

    // Verbose logging for push notification
    await this.userService.logVerboselyIfUserHasVerboseLoggingEnabled(user_id, () => {
      // eslint-disable-next-line no-console
      console.log('Publishing Pusher Beams notification for focus mode completion (verbose logging enabled):', {
        user_id,
        title: pushNotificationTitle,
        body: pushNotificationBody,
        notificationData,
        publishRequest: JSON.stringify(publishRequest),
      });
    });

    try {
      await this.pusherBeamsService.publishToUsers([user_id], publishRequest);

      await this.userService.logVerboselyIfUserHasVerboseLoggingEnabled(user_id, () => {
        // eslint-disable-next-line no-console
        console.log('Pusher Beams notification published successfully for focus mode completion:', user_id);
      });
    } catch (error) {
      await this.userService.logVerboselyIfUserHasVerboseLoggingEnabled(user_id, () => {
        // eslint-disable-next-line no-console
        console.error('Pusher Beams notification failed for focus mode completion:', {
          user_id,
          error: error.message,
          stack: error.stack,
          intention,
        });
      });
      throw error;
    }
  }

  calculateFocusDurationSeconds(fromTime: Date, toTime: Date): number {
    const start = DateTime.fromJSDate(fromTime);
    const end = DateTime.fromJSDate(toTime);
    return end.diff(start, 'seconds').toObject().seconds;
  }

  private async validateFinishingFocusMode(focus_mode_id: string, user_id: string): Promise<User> | never {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Validate finishing focus mode',
      data: {
        user_id,
        focus_mode_id,
      },
    });
    const [focusMode, user] = await this.fetchFocusModeAndUser(focus_mode_id, user_id);
    const notFoundModeMsg = `Focus Mode with id: ${focus_mode_id} does not exist for User with id: ${user_id}!`;
    if (!focusMode) throw new NotFoundException(notFoundModeMsg);
    const { current_focus_mode_id } = user;
    const isCurrentMode = focus_mode_id === current_focus_mode_id;
    const isNotCurrentMsg = `Focus mode with id: ${focus_mode_id} is not current, the current one is ${current_focus_mode_id}!`;
    if (!isCurrentMode) throw new BadRequestException({ message: isNotCurrentMsg, donotloginslack: true });
    return user;
  }

  private async nullifyCurrentFocusModeForUser(user_id: string): Promise<void> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Nullifying current focus mode for user',
      data: {
        user_id,
      },
    });
    const userDataToUpdate = new CurrentFocusModeData({
      finish_time: null,
      focus_mode_id: null,
      completed_mode_id: null,
    });
    await this.userRepository.orm.update(user_id, userDataToUpdate);
  }

  async updateScheduledFinishTime(
    { scheduled_finish_time }: UpdateScheduledFinishDto,
    { focus_mode_id }: GetFocusModeParamsDto,
    user_id: string,
  ): Promise<void> {
    // must be the user’s current focus mode
    const user = await this.validateFinishingFocusMode(focus_mode_id, user_id);

    const block = await this.completedFocusBlockRepository.orm.findOneBy({
      id: user.current_completing_focus_block_id,
    });
    if (!block) throw new NotFoundException('Current focus block not found');

    const newTime = new Date(scheduled_finish_time);
    if (newTime < block.start_time) {
      throw new BadRequestException('scheduled_finish_time must be after start_time');
    }

    // Update the running block
    await this.completedFocusBlockRepository.orm.update(block.id, {
      scheduled_finish_time: newTime,
    });

    // Keep the user’s “current focus mode” data in sync (what CAP returns)
    await this.userRepository.orm.update(user_id, {
      current_focus_mode_finish_time: newTime,
      current_focus_mode_id: focus_mode_id,
      current_completing_focus_block_id: block.id,
      updated_at: new Date().toISOString(),
    });
  }
}
