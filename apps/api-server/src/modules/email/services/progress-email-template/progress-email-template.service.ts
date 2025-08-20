import { Injectable } from '@nestjs/common';
import { User } from '../../../user/entities/user.entity';
import { WeeklyProgressMetricsDto } from '../../../user/dto/weekly-progress-metrics.dto';
import { EmailTemplateCompilerService } from '../email-template-compiler/email-template-compiler.service';

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class ProgressEmailTemplateService {
  constructor(private readonly emailTemplateCompilerService: EmailTemplateCompilerService) {}

  async generateWeeklyProgressEmail(
    user: User,
    metrics: WeeklyProgressMetricsDto,
    unsubscribeToken: string,
  ): Promise<EmailContent> {
    const userName = user.username;

    const weekStart = new Date(metrics.week_start).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
    const weekEnd = new Date(metrics.week_end).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });

    const templateData = {
      userName,
      headerTitle: 'Weekly Progress Report',
      headerSubtitle: `Hi ${userName}! Here's how you did from ${weekStart} to ${weekEnd}`,
      footerText: 'Keep up the great work! 🎉',
      unsubscribeText: 'Unsubscribe from these emails',
      apiUrl: process.env.API_URL,
      dashboardUrl: process.env.DASHBOARD_URL,
      unsubscribeToken,
      manageEmailPreferencesLink: `${process.env.API_URL}/user/email-preferences/manage?token=${unsubscribeToken}`,

      // Progress metrics
      focusUsagePercentage: this.calculateOverallUsage(metrics),
      lastActiveDate: this.getLastActiveDate(user),
      morningRoutineUsage: Math.round((metrics.routines.morning.completed / metrics.routines.morning.total) * 100) || 0,
      eveningRoutineUsage: Math.round((metrics.routines.evening.completed / metrics.routines.evening.total) * 100) || 0,
      focusModeUsage:
        metrics.focus_sessions.sessions_count > 0 ? Math.min(100, metrics.focus_sessions.sessions_count * 10) : 0,
      microBreaksUsage:
        Math.round((metrics.routines.micro_breaks.completed / metrics.routines.micro_breaks.total) * 100) || 0,
      morningRoutineStreak: metrics.streaks.morning_routine,
      eveningRoutineStreak: metrics.streaks.evening_routine,
      focusModeStreak: metrics.streaks.focus_mode,
    };

    return this.emailTemplateCompilerService.compileProgressEmail('weekly-progress', templateData);
  }

  async generateNoProgressEmail(user: User, unsubscribeToken: string): Promise<EmailContent> {
    const userName = user.username || '';

    const templateData = {
      userName,
      headerTitle: 'We Miss You!',
      headerSubtitle: `Hi ${userName}, it's been a while since your last FocusBear session`,
      footerText: "We're here to support you! 🎯",
      unsubscribeText: 'Manage your preferences here',
      apiUrl: process.env.API_URL,
      dashboardUrl: process.env.DASHBOARD_URL,
      manageEmailPreferencesLink: `${process.env.API_URL}/user/email-preferences/manage?token=${unsubscribeToken}`,
      unsubscribeToken,
    };

    return this.emailTemplateCompilerService.compileProgressEmail('no-progress', templateData);
  }

  private calculateOverallUsage(metrics: WeeklyProgressMetricsDto): number {
    const morningUsage = metrics.routines.morning.completed / metrics.routines.morning.total || 0;
    const eveningUsage = metrics.routines.evening.completed / metrics.routines.evening.total || 0;
    const microBreaksUsage = metrics.routines.micro_breaks.completed / metrics.routines.micro_breaks.total || 0;

    const routineUsage = (morningUsage + eveningUsage + microBreaksUsage) / 3;

    const focusUsage =
      metrics.focus_sessions.sessions_count > 0 ? Math.min(1, metrics.focus_sessions.sessions_count / 7) : 0;
    const taskUsage = metrics.tasks.completion_rate || 0;

    return Math.round(((routineUsage + focusUsage + taskUsage) / 3) * 100);
  }

  private getLastActiveDate(user: User): string {
    // Get the most recent activity date from user's activity timestamps
    const dates = [
      user.last_completed_sequence_at,
      user.last_completed_focus_mode_at,
      user.last_completed_sequence_started_at,
    ].filter((date) => date !== null && date !== undefined);

    if (dates.length === 0) {
      // If no activity dates, return "Never"
      return 'Never';
    }

    // Find the most recent date
    const mostRecentDate = dates.reduce((latest, current) => {
      return current > latest ? current : latest;
    });

    // Format the date
    return new Date(mostRecentDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
