import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { User } from '../../../user/entities/user.entity';
import { WeeklyProgressMetricsDto } from '../../../user/dto/weekly-progress-metrics.dto';
import { MonthlyProgressMetricsDto } from '../../../user/dto/monthly-progress-metrics.dto';
import { EmailTemplateCompilerService } from '../email-template-compiler/email-template-compiler.service';
import { AnnouncementsService } from '../../../announcements/services/announcements.service';
import { AnnouncementEntity } from '../../../announcements/entities/announcements.entity';
import { DeviceRepository } from '../../../device/repositories/device.repository';
import { OperatingSystem } from '../../../../shared/domain/operating-system.enum';

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class ProgressEmailTemplateService {
  constructor(
    private readonly emailTemplateCompilerService: EmailTemplateCompilerService,
    private readonly i18nService: I18nService,
    private readonly announcementsService: AnnouncementsService,
    private readonly deviceRepository: DeviceRepository,
  ) {}

  private getMonthlyPeriodDays(metrics: MonthlyProgressMetricsDto): number {
    return Math.max(
      metrics.routines?.morning?.total || 0,
      metrics.routines?.evening?.total || 0,
      metrics.routines?.micro_breaks?.total || 0,
      1,
    );
  }

  private getApiBaseUrl(): string {
    return process.env.API_URL || process.env.DASHBOARD_URL || 'https://api.focusbear.io';
  }

  async generateWeeklyProgressEmail(
    user: User,
    metrics: WeeklyProgressMetricsDto,
    unsubscribeToken: string,
    options: { variant?: 'weekly' | 'daily' } = {},
  ): Promise<EmailContent> {
    const userName = user.username || 'Friend';
    const userLang = user.language || 'en';
    const variant = options.variant || 'weekly';
    const isDaily = variant === 'daily';

    const weekStart = new Date(metrics.week_start).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
    const weekEnd = new Date(metrics.week_end).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
    const singleDay = weekEnd;

    // Fetch announcements based on user's latest device OS
    const announcements = await this.getUserAnnouncements(user.id);

    const templateData = {
      userName,
      variant,
      headerTitle: this.i18nService.t(
        isDaily ? 'common.email_daily_progress_header_title' : 'common.email_weekly_progress_header_title',
        {
          lang: userLang,
          defaultValue: isDaily ? 'Daily Progress Report' : 'Weekly Progress Report',
        },
      ),
      headerSubtitle: isDaily
        ? this.i18nService.t('common.email_daily_progress_header_subtitle', {
            lang: userLang,
            args: { username: userName, date: singleDay },
            defaultValue: `Hi ${userName}! Here's how you did on ${singleDay}`,
          })
        : this.i18nService.t('common.email_weekly_progress_header_subtitle', {
            lang: userLang,
            args: { username: userName, weekStart, weekEnd },
            defaultValue: `Hi ${userName}! Here's how you did from ${weekStart} to ${weekEnd}`,
          }),
      footerText: this.i18nService.t(
        isDaily ? 'common.email_daily_progress_footer_text' : 'common.email_weekly_progress_footer_text',
        {
          lang: userLang,
          defaultValue: 'Keep up the great work!',
        },
      ),
      unsubscribeText: this.i18nService.t('common.email_unsubscribe_text', {
        lang: userLang,
        defaultValue: 'Unsubscribe from these emails',
      }),
      managePreferencesText: this.i18nService.t('common.email_manage_preferences_text', {
        lang: userLang,
        defaultValue: 'Manage email preferences',
      }),
      apiUrl: this.getApiBaseUrl(),
      dashboardUrl: process.env.DASHBOARD_URL || '',
      unsubscribeToken,
      manageEmailPreferencesLink: `${this.getApiBaseUrl()}/user/email-preferences/manage?token=${unsubscribeToken}`,

      // Progress metrics
      focusUsagePercentage: this.calculateOverallUsage(metrics),
      lastActiveDate: this.getLastActiveDate(user, userLang),
      morningRoutineUsage: Math.round((metrics.routines.morning.completed / metrics.routines.morning.total) * 100) || 0,
      eveningRoutineUsage: Math.round((metrics.routines.evening.completed / metrics.routines.evening.total) * 100) || 0,
      focusModeUsage:
        metrics.focus_sessions.sessions_count > 0 ? Math.min(100, metrics.focus_sessions.sessions_count * 10) : 0,
      microBreaksUsage:
        Math.round((metrics.routines.micro_breaks.completed / metrics.routines.micro_breaks.total) * 100) || 0,
      morningRoutineStreak: metrics.streaks.morning_routine,
      eveningRoutineStreak: metrics.streaks.evening_routine,
      focusModeStreak: metrics.streaks.focus_mode,

      // Announcements section
      // These are optional and shown only when available
      announcements,
      announcementsTitle: this.i18nService.t('common.email_announcements_title', {
        lang: userLang,
        defaultValue: 'Latest updates for your device',
      }),
      announcementCtaText: this.i18nService.t('common.email_announcements_cta', {
        lang: userLang,
        defaultValue: 'Learn more',
      }),

      // Translated labels
      focusBearUsageTitle: this.i18nService.t('common.email_focus_bear_usage_title', {
        lang: userLang,
        defaultValue: '🧠 Focus Bear Usage',
      }),
      usageSummaryTitle: this.i18nService.t('common.email_usage_summary_title', {
        lang: userLang,
        defaultValue: '🐻 Your Focus Bear Usage Summary',
      }),
      overallUsageLabel: this.i18nService.t('common.email_overall_usage', {
        lang: userLang,
        defaultValue: 'Overall usage',
      }),
      morningRoutineLabel: this.i18nService.t('common.email_morning_routine', {
        lang: userLang,
        defaultValue: 'Morning routine',
      }),
      eveningRoutineLabel: this.i18nService.t('common.email_evening_routine', {
        lang: userLang,
        defaultValue: 'Evening routine',
      }),
      focusModeLabel: this.i18nService.t('common.email_focus_mode', {
        lang: userLang,
        defaultValue: 'Focus mode',
      }),
      microBreaksLabel: this.i18nService.t('common.email_micro_breaks', {
        lang: userLang,
        defaultValue: 'Micro breaks',
      }),
      lastActiveLabel: this.i18nService.t('common.email_last_active', {
        lang: userLang,
        defaultValue: 'Last active',
      }),
      streakDaysLabel: this.i18nService.t('common.email_streak_days', {
        lang: userLang,
        defaultValue: 'days',
      }),
      streakLabel: this.i18nService.t('common.email_streak', {
        lang: userLang,
        defaultValue: 'streak',
      }),
      yourUsageWasText: this.i18nService.t('common.email_your_usage_was', {
        lang: userLang,
        defaultValue: 'Your Focus Bear usage this week/today was',
      }),
      youLastUsedText: this.i18nService.t('common.email_you_last_used', {
        lang: userLang,
        defaultValue: 'You last used the app on',
      }),
      usageLowWarningText: this.i18nService.t('common.email_usage_low_warning', {
        lang: userLang,
        defaultValue:
          "That's lower than usual — and that's okay. Small, consistent steps add up; whenever you're ready, we're here to help you build momentum.",
      }),
      whyItMattersText: this.i18nService.t('common.email_why_it_matters', {
        lang: userLang,
        defaultValue: 'Why it matters',
      }),
      habitMomentumText: this.i18nService.t('common.email_habit_momentum', {
        lang: userLang,
        defaultValue: 'Habit building needs daily momentum.',
      }),
      hopeDoingWellText: this.i18nService.t('common.email_hope_doing_well', {
        lang: userLang,
        defaultValue: "Hope you're doing well! Here's your weekly/daily Focus Bear performance check-in 👇",
      }),
      cheeringForYouText: this.i18nService.t('common.email_cheering_for_you', {
        lang: userLang,
        defaultValue: "We're cheering for you! 🧡",
      }),
      focusBearTeamText: this.i18nService.t('common.email_focus_bear_team', {
        lang: userLang,
        defaultValue: 'Focus Bear Team',
      }),
      wantToChangeFrequencyText: this.i18nService.t('common.email_want_to_change_frequency', {
        lang: userLang,
        defaultValue: 'Want to change how often you get these emails?',
      }),
    };

    return this.emailTemplateCompilerService.compileProgressEmail('weekly-progress', templateData);
  }

  async generateMonthlyProgressEmail(
    user: User,
    metrics: MonthlyProgressMetricsDto,
    unsubscribeToken: string,
  ): Promise<EmailContent> {
    const userName = user.username || 'Friend';
    const userLang = user.language || 'en';

    // Fetch announcements based on user's latest device OS
    const announcements = await this.getUserAnnouncements(user.id);

    const monthStart = new Date(metrics.month_start).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const monthEnd = new Date(metrics.month_end).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const templateData = {
      userName,
      headerTitle: this.i18nService.t('common.email_monthly_progress_header_title', {
        lang: userLang,
        defaultValue: 'Monthly Progress Report',
      }),
      headerSubtitle: this.i18nService.t('common.email_monthly_progress_header_subtitle', {
        lang: userLang,
        args: { username: userName, monthStart, monthEnd },
        defaultValue: `Hi ${userName}! Here's how you did from ${monthStart} to ${monthEnd}`,
      }),
      footerText: this.i18nService.t('common.email_monthly_progress_footer_text', {
        lang: userLang,
        defaultValue: 'Keep up the great work!',
      }),
      unsubscribeText: this.i18nService.t('common.email_unsubscribe_text', {
        lang: userLang,
        defaultValue: 'Manage email preferences',
      }),
      managePreferencesText: this.i18nService.t('common.email_manage_preferences_text', {
        lang: userLang,
        defaultValue: 'Manage email preferences',
      }),
      apiUrl: this.getApiBaseUrl(),
      dashboardUrl: process.env.DASHBOARD_URL || '',
      unsubscribeToken,
      manageEmailPreferencesLink: `${this.getApiBaseUrl()}/user/email-preferences/manage?token=${unsubscribeToken}`,

      // Announcements section
      // These are optional and shown only when available
      announcements,
      announcementsTitle: this.i18nService.t('common.email_announcements_title', {
        lang: userLang,
        defaultValue: 'Latest updates for your device',
      }),
      announcementCtaText: this.i18nService.t('common.email_announcements_cta', {
        lang: userLang,
        defaultValue: 'Learn more',
      }),

      // Progress metrics
      focusUsagePercentage: this.calculateOverallUsageMonthly(metrics),
      lastActiveDate: this.getLastActiveDate(user, userLang),
      morningRoutineUsage:
        metrics.routines?.morning?.total > 0
          ? Math.round((metrics.routines.morning.completed / metrics.routines.morning.total) * 100)
          : 0,
      eveningRoutineUsage:
        metrics.routines?.evening?.total > 0
          ? Math.round((metrics.routines.evening.completed / metrics.routines.evening.total) * 100)
          : 0,
      focusModeUsage:
        metrics.focus_sessions?.sessions_count > 0
          ? Math.min(
              100,
              Math.round((metrics.focus_sessions.sessions_count / this.getMonthlyPeriodDays(metrics)) * 100),
            )
          : 0,
      microBreaksUsage:
        metrics.routines?.micro_breaks?.total > 0
          ? Math.round((metrics.routines.micro_breaks.completed / metrics.routines.micro_breaks.total) * 100)
          : 0,
      morningRoutineStreak: metrics.streaks?.morning_routine || 0,
      eveningRoutineStreak: metrics.streaks?.evening_routine || 0,
      focusModeStreak: metrics.streaks?.focus_mode || 0,

      // Translated labels
      focusBearUsageTitle: this.i18nService.t('common.email_focus_bear_usage_title', {
        lang: userLang,
        defaultValue: '🧠 Focus Bear Usage',
      }),
      usageSummaryTitle: this.i18nService.t('common.email_usage_summary_title', {
        lang: userLang,
        defaultValue: '🐻 Your Focus Bear Usage Summary',
      }),
      overallUsageLabel: this.i18nService.t('common.email_overall_usage', {
        lang: userLang,
        defaultValue: 'Overall usage',
      }),
      morningRoutineLabel: this.i18nService.t('common.email_morning_routine', {
        lang: userLang,
        defaultValue: 'Morning routine',
      }),
      eveningRoutineLabel: this.i18nService.t('common.email_evening_routine', {
        lang: userLang,
        defaultValue: 'Evening routine',
      }),
      focusModeLabel: this.i18nService.t('common.email_focus_mode', {
        lang: userLang,
        defaultValue: 'Focus mode',
      }),
      microBreaksLabel: this.i18nService.t('common.email_micro_breaks', {
        lang: userLang,
        defaultValue: 'Micro breaks',
      }),
      lastActiveLabel: this.i18nService.t('common.email_last_active', {
        lang: userLang,
        defaultValue: 'Last active',
      }),
      streakDaysLabel: this.i18nService.t('common.email_streak_days', {
        lang: userLang,
        defaultValue: 'days',
      }),
      streakLabel: this.i18nService.t('common.email_streak', {
        lang: userLang,
        defaultValue: 'streak',
      }),
      yourUsageWasText: this.i18nService.t('common.email_your_usage_was_monthly', {
        lang: userLang,
        defaultValue: 'Your Focus Bear usage this month was',
      }),
      youLastUsedText: this.i18nService.t('common.email_you_last_used', {
        lang: userLang,
        defaultValue: 'You last used the app on',
      }),
      usageLowWarningText: this.i18nService.t('common.email_usage_low_warning_monthly', {
        lang: userLang,
        defaultValue:
          "This is too low. Consistent usage is key to building strong habits! Let's get back on track this month. 💪",
      }),
      whyItMattersText: this.i18nService.t('common.email_why_it_matters', {
        lang: userLang,
        defaultValue: 'Why it matters',
      }),
      habitMomentumText: this.i18nService.t('common.email_habit_momentum', {
        lang: userLang,
        defaultValue: 'Habit building needs daily momentum.',
      }),
      hopeDoingWellText: this.i18nService.t('common.email_hope_doing_well_monthly', {
        lang: userLang,
        defaultValue: "Hope you're doing well! Here's your monthly Focus Bear performance check-in 👇",
      }),
      cheeringForYouText: this.i18nService.t('common.email_cheering_for_you', {
        lang: userLang,
        defaultValue: "We're cheering for you! 🧡",
      }),
      focusBearTeamText: this.i18nService.t('common.email_focus_bear_team', {
        lang: userLang,
        defaultValue: 'Focus Bear Team',
      }),
      wantToChangeFrequencyText: this.i18nService.t('common.email_want_to_change_frequency', {
        lang: userLang,
        defaultValue: 'Want to change how often you get these emails?',
      }),
    };

    return this.emailTemplateCompilerService.compileProgressEmail('monthly-progress', templateData);
  }

  async generateNoProgressEmail(user: User, unsubscribeToken: string): Promise<EmailContent> {
    const userName = user.username || 'Friend';
    const userLang = user.language || 'en';

    // Fetch announcements based on user's latest device OS
    const announcements = await this.getUserAnnouncements(user.id);

    const templateData = {
      userName,
      headerTitle: this.i18nService.t('common.email_no_progress_header_title', {
        lang: userLang,
        defaultValue: 'We Miss You!',
      }),
      headerSubtitle: this.i18nService.t('common.email_no_progress_header_subtitle', {
        lang: userLang,
        args: { username: userName },
        defaultValue: `${userName}, we miss you at Focus Bear`,
      }),
      footerText: this.i18nService.t('common.email_no_progress_footer_text', {
        lang: userLang,
        defaultValue: 'We believe in you!',
      }),
      unsubscribeText: this.i18nService.t('common.email_manage_preferences_text', {
        lang: userLang,
        defaultValue: 'Manage email preferences',
      }),
      managePreferencesText: this.i18nService.t('common.email_manage_preferences_text', {
        lang: userLang,
        defaultValue: 'Manage email preferences',
      }),
      apiUrl: this.getApiBaseUrl(),
      dashboardUrl: process.env.DASHBOARD_URL || '',
      manageEmailPreferencesLink: `${this.getApiBaseUrl()}/user/email-preferences/manage?token=${unsubscribeToken}`,
      unsubscribeToken,

      // Announcements section
      // These are optional and shown only when available
      announcements,
      announcementsTitle: this.i18nService.t('common.email_announcements_title', {
        lang: userLang,
        defaultValue: 'Latest updates for your device',
      }),
      announcementCtaText: this.i18nService.t('common.email_announcements_cta', {
        lang: userLang,
        defaultValue: 'Learn more',
      }),

      // Translated labels for no-progress email
      haventSeenYouText: this.i18nService.t('common.email_havent_seen_you', {
        lang: userLang,
        defaultValue: "We haven't seen you around Focus Bear lately — and that's okay!",
      }),
      journeyPausesText: this.i18nService.t('common.email_journey_pauses', {
        lang: userLang,
        defaultValue: 'Every journey has its pauses. The important thing is starting again.',
      }),
      goodNewsTitle: this.i18nService.t('common.email_good_news_title', {
        lang: userLang,
        defaultValue: '🌟 Good news',
      }),
      goodNewsContent: this.i18nService.t('common.email_good_news_content', {
        lang: userLang,
        defaultValue: 'Your habits and goals are still waiting for you — right where you left them.',
      }),
      tinyActionTitle: this.i18nService.t('common.email_tiny_action_title', {
        lang: userLang,
        defaultValue: '🐾 Tiny action for today',
      }),
      openFocusBearText: this.i18nService.t('common.email_open_focus_bear', {
        lang: userLang,
        defaultValue: 'Open Focus Bear',
      }),
      completeOneHabitText: this.i18nService.t('common.email_complete_one_habit', {
        lang: userLang,
        defaultValue: 'Complete just one small habit',
      }),
      smallStepForwardText: this.i18nService.t('common.email_small_step_forward', {
        lang: userLang,
        defaultValue: "That's it. A small step forward is still a step forward! 🧸",
      }),
      getBackOnTrackText: this.i18nService.t('common.email_get_back_on_track', {
        lang: userLang,
        defaultValue: 'Get Back on Track',
      }),
      weBelieveInYouText: this.i18nService.t('common.email_we_believe_in_you', {
        lang: userLang,
        defaultValue: 'We believe in you!',
      }),
      focusBearTeamText: this.i18nService.t('common.email_focus_bear_team', {
        lang: userLang,
        defaultValue: 'Focus Bear Team',
      }),
      wantToChangeFrequencyText: this.i18nService.t('common.email_want_to_change_frequency', {
        lang: userLang,
        defaultValue: 'Want to change how often you get these emails?',
      }),
    };

    return this.emailTemplateCompilerService.compileProgressEmail('no-progress', templateData);
  }

  /**
   * Calculate overall usage percentage for weekly progress
   * Combines routine completion and focus sessions
   * @returns Overall usage percentage (0-100)
   */
  private calculateOverallUsage(metrics: WeeklyProgressMetricsDto): number {
    // Calculate routine completion rates (0-1 scale)
    const morningTotal = metrics.routines?.morning?.total || 0;
    const eveningTotal = metrics.routines?.evening?.total || 0;
    const microTotal = metrics.routines?.micro_breaks?.total || 0;

    const morningUsage = morningTotal > 0 ? metrics.routines.morning.completed / morningTotal : 0;
    const eveningUsage = eveningTotal > 0 ? metrics.routines.evening.completed / eveningTotal : 0;
    const microBreaksUsage = microTotal > 0 ? metrics.routines.micro_breaks.completed / microTotal : 0;

    // Average all routine types
    const routineUsage = (morningUsage + eveningUsage + microBreaksUsage) / 3;

    const periodDays = Math.max(morningTotal, eveningTotal, microTotal, 1);

    // Focus usage: 1 session per day = 100%
    const focusUsage =
      metrics.focus_sessions.sessions_count > 0 ? Math.min(1, metrics.focus_sessions.sessions_count / periodDays) : 0;

    // Tasks are excluded from the usage score until we have real task metrics (current tasks values are placeholders).
    return Math.round(((routineUsage + focusUsage) / 2) * 100);
  }

  /**
   * Calculate overall usage percentage for monthly progress
   * Combines routine completion and focus sessions
   * @returns Overall usage percentage (0-100)
   */
  private calculateOverallUsageMonthly(metrics: MonthlyProgressMetricsDto): number {
    // Calculate routine completion rates (0-1 scale) with null safety
    const morningUsage =
      metrics.routines?.morning?.total > 0 ? metrics.routines.morning.completed / metrics.routines.morning.total : 0;
    const eveningUsage =
      metrics.routines?.evening?.total > 0 ? metrics.routines.evening.completed / metrics.routines.evening.total : 0;
    const microBreaksUsage =
      metrics.routines?.micro_breaks?.total > 0
        ? metrics.routines.micro_breaks.completed / metrics.routines.micro_breaks.total
        : 0;

    // Average all routine types
    const routineUsage = (morningUsage + eveningUsage + microBreaksUsage) / 3;

    // Focus usage: 1 session per day = 100%
    const focusUsage =
      metrics.focus_sessions?.sessions_count > 0
        ? Math.min(1, metrics.focus_sessions.sessions_count / this.getMonthlyPeriodDays(metrics))
        : 0;

    // Tasks are excluded from the usage score until we have real task metrics (current tasks values are placeholders).
    return Math.round(((routineUsage + focusUsage) / 2) * 100);
  }

  private getLastActiveDate(user: User, userLang = 'en'): string {
    const dates = [
      user.last_completed_sequence_at,
      user.last_completed_focus_mode_at,
      user.last_completed_sequence_started_at,
      user.last_time_stats_updated,
      user.updated_at, // Add fallback to updated_at
    ].filter((date) => date !== null && date !== undefined);

    if (dates.length === 0) {
      // Translate "Never" based on language
      return userLang === 'es' ? 'Nunca' : 'Never';
    }

    const mostRecentDate = dates.reduce((latest, current) => {
      return current > latest ? current : latest;
    });

    // Format the date with appropriate locale
    const locale = userLang === 'es' ? 'es-ES' : 'en-US';
    return new Date(mostRecentDate).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Normalize internal OperatingSystem enum to API-friendly string values
   * This ensures consistent OS values when calling the announcements API
   */
  private normalizeOperatingSystem(os?: OperatingSystem | null): string {
    switch (os) {
      case OperatingSystem.iOS:
        return 'ios';
      case OperatingSystem.Android:
        return 'android';
      case OperatingSystem.MacOS:
        return 'macos';
      case OperatingSystem.Windows:
        return 'windows';
      case OperatingSystem.Web:
        return 'web';
      case OperatingSystem.Unknown:
      default:
        // Fallback value to ensure API calls never fail due to missing OS
        return 'unknown';
    }
  }

  /**
   * Get the user's most recent device operating system
   * Used for targeting announcements by platform
   */
  private async getUserOperatingSystem(userId: string): Promise<string> {
    try {
      const latestDevice = await this.deviceRepository.orm.findOne({
        where: { user_id: userId },
        order: { updated_at: 'DESC', created_at: 'DESC' }, // Use the most recently updated device as the source of truth
      });
      return this.normalizeOperatingSystem(latestDevice?.operating_system as OperatingSystem);
    } catch {
      // Safe fallback: email sending should not be blocked by device lookup issues
      return 'unknown';
    }
  }

  /**
   * Fetch active announcements for the user based on their latest device OS
   * Announcements are optional and should never block email delivery
   */
  private async getUserAnnouncements(userId: string): Promise<AnnouncementEntity[]> {
    try {
      const osName = await this.getUserOperatingSystem(userId);
      const response = await this.announcementsService.getActiveAnnouncements(userId, osName);

      // Always return an array so templates can iterate safely
      return response?.announcements ?? [];
    } catch {
      // Fail-safe: announcements are non-critical content
      return [];
    }
  }
}
