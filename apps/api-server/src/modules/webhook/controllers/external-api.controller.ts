import { Body, Controller, Get, Headers, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { FocusModeManagerService } from '../../focus-mode/services/focus-mode-manager/focus-mode-manager.service';
import { FocusModeService } from '../../focus-mode/services/focus-mode/focus-mode.service';
import { CompletedActivityService } from '../../activity/services/completed-activity/completed-activity.service';
import { ActivitySequenceRepository } from '../../activity/repositories/activity-sequence.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { DeviceRepository } from '../../device/repositories/device.repository';
import { DeviceService } from '../../device/services/device/device.service';
import { StartFocusSessionDto } from '../dto/start-focus-session.dto';
import { CompleteHabitDto } from '../dto/complete-habit.dto';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';
import { WebhookEventType } from '../domain/webhook-event-type.enum';
import { WebhookPayload } from '../domain/webhook-payload.model';

@Controller('external/v1')
@UseGuards(IsAuth)
@ApiTags('External API (Zapier/n8n)')
@ApiSecurity('Auth0AccessToken')
export class ExternalApiController {
  constructor(
    private readonly focusModeManagerService: FocusModeManagerService,
    private readonly focusModeService: FocusModeService,
    private readonly completedActivityService: CompletedActivityService,
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    private readonly userRepository: UserRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly deviceService: DeviceService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ status: 200, description: 'User information retrieved successfully' })
  async getCurrentUser(@AuthContext() { user }: Passport) {
    const userData = await this.userRepository.orm.findOne({
      where: { id: user.id },
      select: [
        'id',
        'username',
        'timezone',
        'morning_routines_streak',
        'evening_routines_streak',
        'focus_modes_streak',
        'micro_breaks_streak',
        'created_at',
      ],
    });

    if (!userData) {
      throw new NotFoundException('User not found');
    }

    return {
      id: userData.id,
      username: userData.username,
      timezone: userData.timezone,
      streaks: {
        morning_routines: userData.morning_routines_streak,
        evening_routines: userData.evening_routines_streak,
        focus_modes: userData.focus_modes_streak,
        micro_breaks: userData.micro_breaks_streak,
      },
      created_at: userData.created_at,
    };
  }

  @Get('focus-modes')
  @ApiOperation({ summary: 'Get user focus modes' })
  @ApiResponse({ status: 200, description: 'Focus modes retrieved successfully' })
  async getFocusModes(@AuthContext() { user }: Passport) {
    const focusModes = await this.focusModeService.fetchUserFocusModes(user.id);
    return focusModes.map((fm) => ({
      id: fm.id,
      name: fm.name,
    }));
  }

  @Get('routines')
  @ApiOperation({ summary: 'Get user routines (morning, evening, break)' })
  @ApiResponse({ status: 200, description: 'Routines retrieved successfully' })
  async getRoutines(@AuthContext() { user }: Passport) {
    const sequences = await this.activitySequenceRepository.orm.find({
      where: { user_id: user.id },
      relations: ['activities'],
    });

    return sequences.map((seq) => ({
      id: seq.id,
      type: seq.type,
      activities: seq.activities?.map((act) => ({
        id: act.id,
        name: act.activity_data?.name,
        duration_seconds: act.duration_seconds,
      })),
    }));
  }

  @Get('webhooks/sample/:eventType')
  @ApiOperation({ summary: 'Get a sample webhook payload for testing' })
  @ApiResponse({ status: 200, description: 'Sample webhook payload' })
  async getWebhookSample(@Param('eventType') eventType: string, @AuthContext() { user }: Passport) {
    const timestamp = new Date().toISOString();
    const payload = this.buildSamplePayload(eventType, user.id, timestamp);

    if (!payload) {
      throw new NotFoundException(`Webhook event type "${eventType}" not found`);
    }

    return [payload];
  }

  @Post('focus-session/start')
  @ApiOperation({ summary: 'Start a focus session by focus mode name' })
  @ApiResponse({ status: 200, description: 'Focus session started successfully' })
  async startFocusSession(
    @Headers() headers: any,
    @Body() startFocusSessionDto: StartFocusSessionDto,
    @AuthContext() { user }: Passport,
  ) {
    const focusModes = await this.focusModeService.fetchUserFocusModes(user.id);
    const focusMode = focusModes.find(
      (fm) => fm.name.toLowerCase() === startFocusSessionDto.focus_mode_name.toLowerCase(),
    );

    if (!focusMode) {
      throw new NotFoundException(`Focus mode "${startFocusSessionDto.focus_mode_name}" not found`);
    }

    const now = new Date();
    const durationMinutes = startFocusSessionDto.duration_minutes || 25;
    const finishTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

    await this.focusModeManagerService.startCurrentFocusMode(
      {
        start_time: now,
        finish_time: finishTime,
        intention: startFocusSessionDto.intention || '',
        to_dos: [],
      },
      { focus_mode_id: focusMode.id },
      user.id,
      headers,
    );

    return {
      message: 'Focus session started successfully',
      focus_mode: {
        id: focusMode.id,
        name: focusMode.name,
      },
      start_time: now,
      scheduled_finish_time: finishTime,
    };
  }

  @Post('habit/complete')
  @ApiOperation({ summary: 'Complete a habit by name and routine name' })
  @ApiResponse({ status: 200, description: 'Habit completed successfully' })
  async completeHabit(
    @Headers() headers: any,
    @Body() completeHabitDto: CompleteHabitDto,
    @AuthContext() { user }: Passport,
  ) {
    const routineType = this.mapRoutineNameToType(completeHabitDto.routine_name);
    const sequences = await this.activitySequenceRepository.orm.find({
      where: { user_id: user.id, ...(routineType ? { type: routineType } : {}) },
      relations: ['activities'],
    });

    let targetSequence = null;
    let targetActivity = null;

    for (const seq of sequences) {
      const activity = seq.activities?.find(
        (act) => act.activity_data?.name?.toLowerCase() === completeHabitDto.habit_name.toLowerCase(),
      );
      if (activity) {
        targetSequence = seq;
        targetActivity = activity;
        break;
      }
    }

    if (!targetActivity) {
      throw new NotFoundException(`Habit "${completeHabitDto.habit_name}" not found`);
    }

    const now = new Date();
    const durationLogged = completeHabitDto.duration_seconds || targetActivity.duration_seconds || 60;
    const deviceId = await this.resolveDeviceId(headers, user.id);

    const result = await this.completedActivityService.completeActivity(
      {
        activity_id: targetActivity.id,
        activity_sequence_id: targetSequence.id,
        start_time: now,
        duration_logged: durationLogged,
        device_id: deviceId,
        should_not_update_current_activity: true,
      },
      headers,
      { user_id: user.id },
    );

    return {
      message: 'Habit completed successfully',
      habit: {
        id: targetActivity.id,
        name: targetActivity.activity_data?.name,
      },
      routine: {
        id: targetSequence.id,
        type: targetSequence.type,
      },
      completed_at: now,
      duration_logged: durationLogged,
      completed_activity_log_id: result.completed_activity_log?.id,
    };
  }

  @Get('streaks')
  @ApiOperation({ summary: 'Get user streaks' })
  @ApiResponse({ status: 200, description: 'Streaks retrieved successfully' })
  async getStreaks(@AuthContext() { user }: Passport) {
    const userData = await this.userRepository.orm.findOne({
      where: { id: user.id },
      select: ['morning_routines_streak', 'evening_routines_streak', 'focus_modes_streak', 'micro_breaks_streak'],
    });

    if (!userData) {
      throw new NotFoundException('User not found');
    }

    return {
      morning_routines: userData.morning_routines_streak,
      evening_routines: userData.evening_routines_streak,
      focus_modes: userData.focus_modes_streak,
      micro_breaks: userData.micro_breaks_streak,
    };
  }

  private mapRoutineNameToType(routineName?: string): ActivityType | null {
    if (!routineName) return null;

    const normalized = routineName.trim().toLowerCase();
    if (normalized === 'morning' || normalized === 'morning routine' || normalized === 'morning_routine') {
      return ActivityType.morning;
    }
    if (normalized === 'evening' || normalized === 'evening routine' || normalized === 'evening_routine') {
      return ActivityType.evening;
    }
    if (
      normalized === 'break' ||
      normalized === 'breaks' ||
      normalized === 'micro breaks' ||
      normalized === 'micro_breaks' ||
      normalized === 'break routine' ||
      normalized === 'break_routine'
    ) {
      return ActivityType.break;
    }

    return null;
  }

  private buildSamplePayload(eventType: string, userId: string, timestamp: string): WebhookPayload | null {
    switch (eventType) {
      case WebhookEventType.HABIT_COMPLETED:
        return {
          event_type: WebhookEventType.HABIT_COMPLETED,
          timestamp,
          user_id: userId,
          data: {
            habit_name: 'Morning Meditation',
            routine_name: 'morning',
            duration_seconds: 600,
            completed_at: timestamp,
          },
        };
      case WebhookEventType.ROUTINE_COMPLETED:
        return {
          event_type: WebhookEventType.ROUTINE_COMPLETED,
          timestamp,
          user_id: userId,
          data: {
            routine_name: 'morning',
            completed_habits_count: 5,
            completed_at: timestamp,
          },
        };
      case WebhookEventType.FOCUS_SESSION_STARTED:
        return {
          event_type: WebhookEventType.FOCUS_SESSION_STARTED,
          timestamp,
          user_id: userId,
          data: {
            focus_mode_name: 'Deep Work',
            intention: 'Complete project report',
            scheduled_finish_time: new Date(new Date(timestamp).getTime() + 60 * 60 * 1000).toISOString(),
            started_at: timestamp,
          },
        };
      case WebhookEventType.FOCUS_SESSION_COMPLETED:
        return {
          event_type: WebhookEventType.FOCUS_SESSION_COMPLETED,
          timestamp,
          user_id: userId,
          data: {
            focus_mode_name: 'Deep Work',
            intention: 'Complete project report',
            duration_seconds: 3600,
            completed_at: timestamp,
          },
        };
      case WebhookEventType.BREAK_STARTED:
        return {
          event_type: WebhookEventType.BREAK_STARTED,
          timestamp,
          user_id: userId,
          data: {
            break_name: 'Stretch Break',
            started_at: timestamp,
          },
        };
      case WebhookEventType.BREAK_COMPLETED:
        return {
          event_type: WebhookEventType.BREAK_COMPLETED,
          timestamp,
          user_id: userId,
          data: {
            break_name: 'Stretch Break',
            duration_seconds: 300,
            completed_at: timestamp,
          },
        };
      default:
        return null;
    }
  }

  private async resolveDeviceId(headers: any, userId: string): Promise<string> {
    if (headers?.device_id) {
      return headers.device_id;
    }

    const leaderDevice = await this.deviceRepository.orm.findOne({
      where: { user_id: userId, is_leader: true },
      order: { updated_at: 'DESC' },
    });

    if (leaderDevice?.id) {
      return leaderDevice.id;
    }

    const device = await this.deviceService.createOrUpdateDevice(
      {
        operating_system: OperatingSystem.Web,
        metadata: { source: 'external-integration', integration: 'zapier-n8n' },
      },
      userId,
    );

    return device.id;
  }
}
