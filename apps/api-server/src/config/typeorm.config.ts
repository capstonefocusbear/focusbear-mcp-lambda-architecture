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
import { CourseEnrolment } from '../modules/course/entities/course-enrolment.enitiy';
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
    logging: false,
    maxQueryExecutionTime: 200,
    entities: [
      User,
      Activity,
      ActivitySequence,
      CompletedActivity,
      Device,
      CompletedActivitySequence,
      FocusMode,
      CompletedFocusBlock,
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
    ],
    migrations: [join(__dirname, '../../migrations/**/*.{ts,js}'), join(__dirname, '../../seeds/**/*.{ts,js}')],
  }),
);
