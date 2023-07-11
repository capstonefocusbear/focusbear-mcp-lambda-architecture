import { DataSource } from 'typeorm';
import { DailyStats } from '../apps/api-server/src/modules/user/entities/user-daily-stats.entity';
import { Notification } from '../apps/api-server/src/modules/notification/entities/notification.entity';
import { ActivityTemplate } from '../apps/api-server/src/modules/activity-template/entity/activity-template.entity';
import { ActivitySequence } from '../apps/api-server/src/modules/activity/entities/activity-sequence.entity';
import { Activity } from '../apps/api-server/src/modules/activity/entities/activity.entity';
import { CompletedActivitySequence } from '../apps/api-server/src/modules/activity/entities/completed-activity-sequence.entity';
import { CompletedActivity } from '../apps/api-server/src/modules/activity/entities/completed-activity.entity';
import { CourseEnrolment } from '../apps/api-server/src/modules/course/entities/course-enrolment.enitiy';
import { CourseRating } from '../apps/api-server/src/modules/course/entities/course-rating.entity';
import { Course } from '../apps/api-server/src/modules/course/entities/course.entity';
import { Device } from '../apps/api-server/src/modules/device/entities/device.entity';
import { FocusModeTemplate } from '../apps/api-server/src/modules/focus-mode-template/entities/focus-mode-template.entity';
import { InstalledFocusModeTemplate } from '../apps/api-server/src/modules/focus-mode-template/entities/installed-focus-mode_templates.entity';
import { CompletedFocusBlock } from '../apps/api-server/src/modules/focus-mode/entities/completed-focus-block.entity';
import { FocusMode } from '../apps/api-server/src/modules/focus-mode/entities/focus-mode.entity';
import { HabitPack } from '../apps/api-server/src/modules/habit-pack/entity/habit-pack.entity';
import { InstalledPack } from '../apps/api-server/src/modules/habit-pack/entity/installed-pack.entity';
import { LessonCompletion } from '../apps/api-server/src/modules/lesson/entities/lesson-completion.entity';
import { Lesson } from '../apps/api-server/src/modules/lesson/entities/lesson.entity';
import { Team } from '../apps/api-server/src/modules/team/entities/team.entity';
import { Track } from '../apps/api-server/src/modules/tracks/entities/track.entity';
import { UserConsent } from '../apps/api-server/src/modules/user/entities/user-consent.entity';
import { User } from '../apps/api-server/src/modules/user/entities/user.entity';
import { VideoMetadata } from '../apps/api-server/src/modules/video-metadata/entities/video-metadata.entity';
import { AdminAccessRequest } from '../apps/api-server/src/modules/user/entities/admin-access-requests.entity';
import { LogQuantityQuestion } from '../apps/api-server/src/modules/activity/entities/log-quantity-questions';
import { LogQuantityAnswer } from '../apps/api-server/src/modules/activity/entities/log-quantity-answers';
import { FocusModeTag } from '../apps/api-server/src/modules/focus-mode/entities/focus-mode-tags';
import { SavedWebsite } from '../apps/api-server/src/modules/saved-website/entities/saved-website.entity';

export const CronJobDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  logging: false,
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
  subscribers: [],
  migrations: [],
});
