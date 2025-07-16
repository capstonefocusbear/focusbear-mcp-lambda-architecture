import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import * as path from 'path';
import { ToDo } from '../../src/modules/to-do/entities/to-do.entity';
import { ToDoRepository } from '../../src/modules/to-do/repositories/to-do.repository';
import { User } from '../../src/modules/user/entities/user.entity';
import { UserTypes } from '../../src/modules/user/domain/user-types.enum';
import { PageOrder } from '../../src/shared/domain/page-order.enum';
import { SyncedProject } from '../../src/modules/to-do/entities/synced-project.entity';
import { FocusModeTag } from '../../src/modules/focus-mode/entities/focus-mode-tags';
import { FocusMode } from '../../src/modules/focus-mode/entities/focus-mode.entity';
import { FocusModeTemplate } from '../../src/modules/focus-mode-template/entities/focus-mode-template.entity';
import { CompletedFocusBlock } from '../../src/modules/focus-mode/entities/completed-focus-block.entity';
import { InstalledFocusModeTemplate } from '../../src/modules/focus-mode-template/entities/installed-focus-mode_templates.entity';
import { ActivityTemplateTag } from '../../src/modules/activity-template/entity/activity-template-tag.entity';
import { UserConsent } from '../../src/modules/user/entities/user-consent.entity';
import { Course } from '../../src/modules/course/entities/course.entity';
import { DailyStats } from '../../src/modules/user/entities/user-daily-stats.entity';
import { AdminAccessRequest } from '../../src/modules/user/entities/admin-access-requests.entity';
import { UserFeedback } from '../../src/modules/user/entities/user-feedback.entity';
import { LogQuantityQuestion } from '../../src/modules/activity/entities/log-quantity-questions';
import { LogQuantityAnswer } from '../../src/modules/activity/entities/log-quantity-answers';
import { SavedWebsite } from '../../src/modules/saved-website/entities/saved-website.entity';
import { ImpactEvent } from '../../src/modules/events/entities/impact-event.entity';
import { TaskTimeLog } from '../../src/modules/to-do/entities/tasks-time-logs.entity';
import { PlatformIntegration } from '../../src/modules/platform-integrations/entities/platform-integration.entity';
import { CalendarExcludedKeyword } from '../../src/modules/calendar/entities/calendar-excluded-keywords.entity';
import { Calendar } from '../../src/modules/calendar/entities/calendar.entity';
import { TeamToMember } from '../../src/modules/team/entities/team-to-member.entity';
import { TeamToAdmin } from '../../src/modules/team/entities/team-to-admin.entity';
import { TrackEvent } from '../../src/modules/events/entities/track-event.entity';
import { Tutorial } from '../../src/modules/activity/entities/tutorial.entity';
import { Survey } from '../../src/modules/survey/entities/survey.entity';
import { SurveyAnswer } from '../../src/modules/survey/entities/survey-answer.entity';
import { SurveyAnswerMetadata } from '../../src/modules/survey/entities/survey-answer-metadata.entity';
import { ActivityTemplate } from '../../src/modules/activity-template/entity/activity-template.entity';
import { CustomRoutine } from '../../src/modules/user/entities/custom-routine';
import { StudyParticipant } from '../../src/modules/user/entities/study-participant.entity';
import { UsageData } from '../../src/modules/user/entities/usage-data.entity';
import { HealthMetrics } from '../../src/modules/user/entities/health-metrics.entity';
import { FlankerTest } from '../../src/modules/user/entities/flanker-test.entity';
import { Activity } from '../../src/modules/activity/entities/activity.entity';
import { ActivitySequence } from '../../src/modules/activity/entities/activity-sequence.entity';
import { CompletedActivity } from '../../src/modules/activity/entities/completed-activity.entity';
import { Device } from '../../src/modules/device/entities/device.entity';
import { CompletedActivitySequence } from '../../src/modules/activity/entities/completed-activity-sequence.entity';
import { Team } from '../../src/modules/team/entities/team.entity';
import { HabitPack } from '../../src/modules/habit-pack/entity/habit-pack.entity';
import { InstalledPack } from '../../src/modules/habit-pack/entity/installed-pack.entity';
import { VideoMetadata } from '../../src/modules/video-metadata/entities/video-metadata.entity';
import { Track } from '../../src/modules/tracks/entities/track.entity';
import { CourseEnrolment } from '../../src/modules/course/entities/course-enrolment.entity';
import { CourseRating } from '../../src/modules/course/entities/course-rating.entity';
import { Lesson } from '../../src/modules/lesson/entities/lesson.entity';
import { LessonCompletion } from '../../src/modules/lesson/entities/lesson-completion.entity';
import { Feedback } from '../../../../libs/stripe/src/entities/feedback.entity';
import { AsyncTask } from '../../src/modules/async-task/entities/async-task.entity';
import { Notification } from '../../src/modules/notification/entities/notification.entity';

dotenvConfig({ path: path.resolve(__dirname, '../../../../.env') });

describe('ToDoRepository Top Score Calculation (DB Integration)', () => {
  let dataSource: DataSource;
  let toDoRepository: ToDoRepository;
  let testProject: SyncedProject;
  let testTag: FocusModeTag;
  const testUserId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.INTEGRATION_TEST_DB_HOST,
      port: Number(process.env.INTEGRATION_TEST_DB_PORT),
      username: process.env.INTEGRATION_TEST_DB_USERNAME,
      password: process.env.INTEGRATION_TEST_DB_PASSWORD,
      database: process.env.INTEGRATION_TEST_DB_NAME || 'integration-test-db',
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
      synchronize: false,
    });
    await dataSource.initialize();
    toDoRepository = new ToDoRepository(dataSource.manager.connection);

    // Insert test user
    await dataSource.getRepository(User).save({
      id: testUserId,
      username: 'topscoretestuser',
      auth0_id: 'auth0|topscoretestuser',
      user_type: UserTypes.STANDARD,
      timezone: 'UTC',
    });

    // Insert a test project
    testProject = await dataSource.getRepository(SyncedProject).save({
      user_id: testUserId,
      external_project_id: 'external-proj-1',
      available_statuses: [{ label: 'Open', status_id: 'open', should_complete_task: false }],
    });

    // Insert a test tag
    testTag = await dataSource.getRepository(FocusModeTag).save({
      text: 'Urgent',
      user_id: testUserId,
    });

    const today = new Date();
    await dataSource.getRepository(ToDo).save([
      // No due date
      {
        id: '00000000-0000-0000-0000-000000000002',
        user_id: testUserId,
        title: 'No Due Date',
        perspiration_level: 2,
        outcome: 10,
        status: 'NOT_STARTED',
      },
      // Overdue
      {
        id: '00000000-0000-0000-0000-000000000003',
        user_id: testUserId,
        title: 'Overdue',
        due_date: new Date(today.getTime() - 86400000), // yesterday
        perspiration_level: 2,
        outcome: 10,
        status: 'NOT_STARTED',
      },
      // Due today
      {
        id: '00000000-0000-0000-0000-000000000004',
        user_id: testUserId,
        title: 'Due Today',
        due_date: today,
        perspiration_level: 2,
        outcome: 10,
        status: 'NOT_STARTED',
      },
      // Due in 10 days
      {
        id: '00000000-0000-0000-0000-000000000005',
        user_id: testUserId,
        title: 'Due in 10 Days',
        due_date: new Date(today.getTime() + 10 * 86400000),
        perspiration_level: 2,
        outcome: 10,
        status: 'NOT_STARTED',
      },
      // Due in 400 days
      {
        id: '00000000-0000-0000-0000-000000000006',
        user_id: testUserId,
        title: 'Due in 400 Days',
        due_date: new Date(today.getTime() + 400 * 86400000),
        perspiration_level: 2,
        outcome: 10,
        status: 'NOT_STARTED',
      },
      // With tag
      {
        id: '00000000-0000-0000-0000-000000000007',
        user_id: testUserId,
        title: 'With Tag',
        perspiration_level: 2,
        outcome: 10,
        status: 'NOT_STARTED',
        tags: [testTag],
      },
      // With project
      {
        id: '00000000-0000-0000-0000-000000000008',
        user_id: testUserId,
        title: 'With Project',
        perspiration_level: 2,
        outcome: 10,
        status: 'NOT_STARTED',
        synced_project_id: testProject.id,
      },
      // High outcome, low perspiration
      {
        id: '00000000-0000-0000-0000-000000000009',
        user_id: testUserId,
        title: 'High Outcome Low Perspiration',
        perspiration_level: 1,
        outcome: 10,
        status: 'NOT_STARTED',
      },
      // Low outcome, high perspiration
      {
        id: '00000000-0000-0000-0000-000000000010',
        user_id: testUserId,
        title: 'Low Outcome High Perspiration',
        perspiration_level: 10,
        outcome: 1,
        status: 'NOT_STARTED',
      },
      // Both outcome and perspiration at minimum
      {
        id: '00000000-0000-0000-0000-000000000011',
        user_id: testUserId,
        title: 'Min Outcome Min Perspiration',
        perspiration_level: 1,
        outcome: 1,
        status: 'NOT_STARTED',
      },
      // Both outcome and perspiration at maximum
      {
        id: '00000000-0000-0000-0000-000000000012',
        user_id: testUserId,
        title: 'Max Outcome Max Perspiration',
        perspiration_level: 10,
        outcome: 10,
        status: 'NOT_STARTED',
      },
    ]);
  });

  afterAll(async () => {
    await dataSource.getRepository(ToDo).delete({ user_id: testUserId });
    await dataSource.getRepository(FocusModeTag).delete({ user_id: testUserId });
    await dataSource.getRepository(SyncedProject).delete({ user_id: testUserId });
    await dataSource.getRepository(User).delete({ id: testUserId });
    await dataSource.destroy();
  });

  it('should return todos in correct order by top_score (by title)', async () => {
    const [results] = await toDoRepository.getUserToDos(testUserId, {
      take: 20,
      skip: 0,
      order: PageOrder.DESC,
    });
    const expectedOrder = [
      'Overdue', // 50
      'High Outcome Low Perspiration', // 50
      'Due Today', // 49.5
      'Due in 10 Days', // ~48.15
      'With Tag', // 25
      'With Project', // 25
      'No Due Date', // 25`
      'Min Outcome Min Perspiration', // 5
      'Max Outcome Max Perspiration', // 5
      'Low Outcome High Perspiration', // 0.5
      'Due in 400 Days', // 0.5
    ];
    const resultTitles = (results as ToDo[]).map((t) => t.title);
    expect(resultTitles).toEqual(expectedOrder);
  });

  it('should include tag data for todos with tags', async () => {
    const [results] = await toDoRepository.getUserToDos(testUserId, {
      take: 20,
      skip: 0,
      order: PageOrder.DESC,
    });
    const withTag = (results as ToDo[]).find((t) => t.title === 'With Tag');
    expect(withTag.tags).toBeDefined();
    expect(withTag.tags.length).toBeGreaterThan(0);
    expect(withTag.tags[0].text).toBe('Urgent');
  });

  it('should return correct raw SQL output for top_score calculation', async () => {
    const rawResults = await dataSource.query(
      `
      SELECT
        to_do.id,
        ${ToDoRepository.TOP_SCORE_SQL} AS top_score
      FROM to_do
      WHERE to_do.user_id = $1
    `,
      [testUserId],
    );

    // just need to check id 02 to 06
    const expectedResults = [
      {
        id: '00000000-0000-0000-0000-000000000002',
        top_score: 25,
      }, // no due date
      {
        id: '00000000-0000-0000-0000-000000000003',
        top_score: 50,
      }, // overdue

      {
        id: '00000000-0000-0000-0000-000000000004',
        top_score: 49.5,
      }, // due today
      {
        id: '00000000-0000-0000-0000-000000000005',
        top_score: 48.15753424657535,
      }, // due in 10 days
      {
        id: '00000000-0000-0000-0000-000000000006',
        top_score: 0.5,
      }, // due in 400 days
      { id: '00000000-0000-0000-0000-000000000007', top_score: 25 },
      { id: '00000000-0000-0000-0000-000000000008', top_score: 25 },
      {
        id: '00000000-0000-0000-0000-000000000009',
        top_score: 50,
      }, // high outcome low perspiration
      {
        id: '00000000-0000-0000-0000-000000000010',
        top_score: 0.5,
      }, // low outcome high perspiration
      {
        id: '00000000-0000-0000-0000-000000000011',
        top_score: 5,
      }, // min outcome min perspiration
      {
        id: '00000000-0000-0000-0000-000000000012',
        top_score: 5,
      }, // max outcome max perspiration
    ];
    // iterate over ids 02 to 06 and check if the top_score is correct
    for (let i = 0; i < expectedResults.length; i++) {
      expect(rawResults[i].top_score).toBe(expectedResults[i].top_score);
    }
  });
});
