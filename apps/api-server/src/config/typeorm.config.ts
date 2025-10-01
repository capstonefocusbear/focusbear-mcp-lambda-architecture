import { registerAs } from '@nestjs/config';
import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { ActivitySequence } from '../modules/activity/entities/activity-sequence.entity';
import { Activity } from '../modules/activity/entities/activity.entity';
import { CompletedActivitySequence } from '../modules/activity/entities/completed-activity-sequence.entity';
import { CompletedActivity } from '../modules/activity/entities/completed-activity.entity';
import { Device } from '../modules/device/entities/device.entity';
import { CompletedFocusBlock } from '../modules/focus-mode/entities/completed-focus-block.entity';
import { FocusMode } from '../modules/focus-mode/entities/focus-mode.entity';
import { BlockingSchedule } from '../modules/focus-mode/entities/blocking-schedule.entity';
import { Team } from '../modules/team/entities/team.entity';
import { User } from '../modules/user/entities/user.entity';
import { HabitPack } from '../modules/habit-pack/entity/habit-pack.entity';
import { InstalledPack } from '../modules/habit-pack/entity/installed-pack.entity';
import { ActivityTemplate } from '../modules/activity-template/entity/activity-template.entity';
import { Notification } from '../modules/notification/entities/notification.entity';
import { VideoMetadata } from '../modules/video-metadata/entities/video-metadata.entity';
import { Track } from '../modules/tracks/entities/track.entity';
import { FocusModeTemplate } from '../modules/focus-mode-template/entities/focus-mode-template.entity';
import { InstalledFocusModeTemplate } from '../modules/focus-mode-template/entities/installed-focus-mode_templates.entity';
import { Course } from '../modules/course/entities/course.entity';
import { CourseEnrolment } from '../modules/course/entities/course-enrolment.entity';
import { CourseRating } from '../modules/course/entities/course-rating.entity';
import { Lesson } from '../modules/lesson/entities/lesson.entity';
import { LessonCompletion } from '../modules/lesson/entities/lesson-completion.entity';
import { UserConsent } from '../modules/user/entities/user-consent.entity';
import { DailyStats } from '../modules/user/entities/user-daily-stats.entity';
import { AdminAccessRequest } from '../modules/user/entities/admin-access-requests.entity';
import { LogQuantityQuestion } from '../modules/activity/entities/log-quantity-questions';
import { LogQuantityAnswer } from '../modules/activity/entities/log-quantity-answers';
import { FocusModeTag } from '../modules/focus-mode/entities/focus-mode-tags';
import { SavedWebsite } from '../modules/saved-website/entities/saved-website.entity';
import { ToDo } from '../modules/to-do/entities/to-do.entity';
import { ImpactEvent } from '../modules/events/entities/impact-event.entity';
import { UserFeedback } from '../modules/user/entities/user-feedback.entity';
import { TaskTimeLog } from '../modules/to-do/entities/tasks-time-logs.entity';
import { PlatformIntegration } from '../modules/platform-integrations/entities/platform-integration.entity';
import { SyncedProject } from '../modules/to-do/entities/synced-project.entity';
import { CalendarExcludedKeyword } from '../modules/calendar/entities/calendar-excluded-keywords.entity';
import { Calendar } from '../modules/calendar/entities/calendar.entity';
import { TeamToMember } from '../modules/team/entities/team-to-member.entity';
import { TeamToAdmin } from '../modules/team/entities/team-to-admin.entity';
import { TrackEvent } from '../modules/events/entities/track-event.entity';
import { Tutorial } from '../modules/activity/entities/tutorial.entity';
import { Feedback } from '../../../../libs/stripe/src/entities/feedback.entity';
import { Survey } from '../modules/survey/entities/survey.entity';
import { SurveyAnswer } from '../modules/survey/entities/survey-answer.entity';
import { SurveyAnswerMetadata } from '../modules/survey/entities/survey-answer-metadata.entity';
import { ActivityTemplateTag } from '../modules/activity-template/entity/activity-template-tag.entity';
import { CustomRoutine } from '../modules/user/entities/custom-routine';
import { StudyParticipant } from '../modules/user/entities/study-participant.entity';
import { UsageData } from '../modules/user/entities/usage-data.entity';
import { HealthMetrics } from '../modules/user/entities/health-metrics.entity';
import { FlankerTest } from '../modules/user/entities/flanker-test.entity';
import { AsyncTask } from '../modules/async-task/entities/async-task.entity';

export const typeormConfig = registerAs(
  'typeorm',
  (): DataSourceOptions => ({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT) || 5432,
    username: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: false,
    logging: true,
    maxQueryExecutionTime: 200,
    ssl: process.env.AWS_REGION ? { rejectUnauthorized: false } : false,
    entities: [
      User,
      Activity,
      ActivitySequence,
      CompletedActivity,
      Device,
      CompletedActivitySequence,
      FocusMode,
      CompletedFocusBlock,
      BlockingSchedule,
      Team,
      HabitPack,
      InstalledPack,
      ActivityTemplate,
      Notification,
      VideoMetadata,
      Track,
      FocusModeTemplate,
      InstalledFocusModeTemplate,
      Course,
      CourseEnrolment,
      CourseRating,
      Lesson,
      LessonCompletion,
      UserConsent,
      DailyStats,
      AdminAccessRequest,
      LogQuantityQuestion,
      LogQuantityAnswer,
      FocusModeTag,
      SavedWebsite,
      ToDo,
      ImpactEvent,
      UserFeedback,
      TaskTimeLog,
      PlatformIntegration,
      SyncedProject,
      CalendarExcludedKeyword,
      Calendar,
      TeamToMember,
      TeamToAdmin,
      CalendarExcludedKeyword,
      Calendar,
      TrackEvent,
      Tutorial,
      Feedback,
      Survey,
      SurveyAnswer,
      SurveyAnswerMetadata,
      ActivityTemplateTag,
      CustomRoutine,
      StudyParticipant,
      UsageData,
      HealthMetrics,
      FlankerTest,
      AsyncTask,
    ],
    migrations: [join(__dirname, '../../migrations/**/*.{ts,js}'), join(__dirname, '../../seeds/**/*.{ts,js}')],
  }),
);
