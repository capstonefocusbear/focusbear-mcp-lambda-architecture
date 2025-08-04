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
  const testUserId = '00000000-0000-0000-0000-000000000001';

  // Global test data that can be reused across tests
  const getGlobalTestData = (today: Date) => ({
    dueDateTestCases: [
      {
        id: '00000000-0000-0000-0000-000000000002',
        user_id: testUserId,
        title: 'Overdue - Same Outcome Perspiration',
        due_date: new Date(today.getTime() - 86400000), // yesterday
        perspiration_level: 5,
        outcome: 5,
        status: 'NOT_STARTED',
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        user_id: testUserId,
        title: 'Due Today - Same Outcome Perspiration',
        due_date: today,
        perspiration_level: 5,
        outcome: 5,
        status: 'NOT_STARTED',
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        user_id: testUserId,
        title: 'Due Next Week - Same Outcome Perspiration',
        due_date: new Date(today.getTime() + 7 * 86400000),
        perspiration_level: 5,
        outcome: 5,
        status: 'NOT_STARTED',
      },
      {
        id: '00000000-0000-0000-0000-000000000005',
        user_id: testUserId,
        title: 'Due Next Year - Same Outcome Perspiration',
        due_date: new Date(today.getTime() + 365 * 86400000),
        perspiration_level: 5,
        outcome: 5,
        status: 'NOT_STARTED',
      },
      {
        id: '00000000-0000-0000-0000-000000000006',
        user_id: testUserId,
        title: 'No Due Date - Same Outcome Perspiration',
        perspiration_level: 5,
        outcome: 5,
        status: 'NOT_STARTED',
      },
    ],
    perspirationTestCases: [
      {
        id: '00000000-0000-0000-0000-000000000007',
        user_id: testUserId,
        title: 'High Perspiration (10) - Same Outcome Due Today',
        due_date: today,
        perspiration_level: 10,
        outcome: 5,
        status: 'NOT_STARTED',
      },
      {
        id: '00000000-0000-0000-0000-000000000008',
        user_id: testUserId,
        title: 'Mid Perspiration (5) - Same Outcome Due Today',
        due_date: today,
        perspiration_level: 5,
        outcome: 5,
        status: 'NOT_STARTED',
      },
      {
        id: '00000000-0000-0000-0000-000000000009',
        user_id: testUserId,
        title: 'Low Perspiration (1) - Same Outcome Due Today',
        due_date: today,
        perspiration_level: 1,
        outcome: 5,
        status: 'NOT_STARTED',
      },
    ],
    outcomeTestCases: [
      {
        id: '00000000-0000-0000-0000-000000000010',
        user_id: testUserId,
        title: 'High Outcome (10) - Same Perspiration Due Today',
        due_date: today,
        perspiration_level: 5,
        outcome: 10,
        status: 'NOT_STARTED',
      },
      {
        id: '00000000-0000-0000-0000-000000000011',
        user_id: testUserId,
        title: 'Mid Outcome (5) - Same Perspiration Due Today',
        due_date: today,
        perspiration_level: 5,
        outcome: 5,
        status: 'NOT_STARTED',
      },
      {
        id: '00000000-0000-0000-0000-000000000012',
        user_id: testUserId,
        title: 'Low Outcome (1) - Same Perspiration Due Today',
        due_date: today,
        perspiration_level: 5,
        outcome: 1,
        status: 'NOT_STARTED',
      },
    ],
  });

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
  });

  afterAll(async () => {
    await dataSource.getRepository(ToDo).delete({ user_id: testUserId });
    await dataSource.getRepository(FocusModeTag).delete({ user_id: testUserId });
    await dataSource.getRepository(SyncedProject).delete({ user_id: testUserId });
    await dataSource.getRepository(User).delete({ id: testUserId });
    await dataSource.destroy();
  });

  it('should test due date variations with same outcome/perspiration', async () => {
    const today = new Date();
    const { dueDateTestCases } = getGlobalTestData(today);

    await dataSource.getRepository(ToDo).save(dueDateTestCases);

    try {
      const [results] = await toDoRepository.getUserToDos(testUserId, {
        take: 20,
        skip: 0,
        order: PageOrder.DESC,
      });

      const resultTitles = (results as ToDo[]).map((t) => t.title);

      // Verify all due date variations are present and in correct order
      const expectedDueDateOrder = [
        'Overdue - Same Outcome Perspiration',
        'Due Today - Same Outcome Perspiration',
        'Due Next Week - Same Outcome Perspiration',
        'Due Next Year - Same Outcome Perspiration',
        'No Due Date - Same Outcome Perspiration',
      ];

      expect(resultTitles).toEqual(expectedDueDateOrder);
    } finally {
      // Clean up test data
      await dataSource.getRepository(ToDo).delete({ user_id: testUserId });
    }
  });

  it('should test perspiration level impact on scoring', async () => {
    const today = new Date();
    const { perspirationTestCases } = getGlobalTestData(today);

    await dataSource.getRepository(ToDo).save(perspirationTestCases);

    try {
      const [results] = await toDoRepository.getUserToDos(testUserId, {
        take: 20,
        skip: 0,
        order: PageOrder.DESC,
      });

      const resultTitles = (results as ToDo[]).map((t) => t.title);

      // Verify all perspiration variations are present and in correct order
      const expectedPerspirationOrder = [
        'Low Perspiration (1) - Same Outcome Due Today',
        'Mid Perspiration (5) - Same Outcome Due Today',
        'High Perspiration (10) - Same Outcome Due Today',
      ];

      expect(resultTitles).toEqual(expectedPerspirationOrder);
    } finally {
      // Clean up test data
      await dataSource.getRepository(ToDo).delete({ user_id: testUserId });
    }
  });

  it('should test outcome level impact on scoring', async () => {
    const today = new Date();
    const { outcomeTestCases } = getGlobalTestData(today);

    await dataSource.getRepository(ToDo).save(outcomeTestCases);

    try {
      const [results] = await toDoRepository.getUserToDos(testUserId, {
        take: 20,
        skip: 0,
        order: PageOrder.DESC,
      });

      const resultTitles = (results as ToDo[]).map((t) => t.title);

      // Verify all outcome variations are present and in correct order
      const expectedOutcomeOrder = [
        'High Outcome (10) - Same Perspiration Due Today',
        'Mid Outcome (5) - Same Perspiration Due Today',
        'Low Outcome (1) - Same Perspiration Due Today',
      ];

      expect(resultTitles).toEqual(expectedOutcomeOrder);
    } finally {
      // Clean up test data
      await dataSource.getRepository(ToDo).delete({ user_id: testUserId });
    }
  });

  it('should return correct raw SQL output for top_score calculation', async () => {
    const today = new Date();
    const { dueDateTestCases, perspirationTestCases, outcomeTestCases } = getGlobalTestData(today);

    // Insert test data for raw SQL testing
    const testCases = [...dueDateTestCases, ...perspirationTestCases, ...outcomeTestCases];

    await dataSource.getRepository(ToDo).save(testCases);

    try {
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

      // Expected results based on the scoring formula
      const expectedResults = [
        { id: '00000000-0000-0000-0000-000000000002', top_score: 10 },
        { id: '00000000-0000-0000-0000-000000000003', top_score: 8 },
        {
          id: '00000000-0000-0000-0000-000000000004',
          top_score: 4.880837687480247,
        },
        { id: '00000000-0000-0000-0000-000000000005', top_score: 0.1 },
        { id: '00000000-0000-0000-0000-000000000006', top_score: 0.1 },
        { id: '00000000-0000-0000-0000-000000000007', top_score: 4 },
        { id: '00000000-0000-0000-0000-000000000008', top_score: 8 },
        { id: '00000000-0000-0000-0000-000000000009', top_score: 40 },
        { id: '00000000-0000-0000-0000-000000000010', top_score: 16 },
        { id: '00000000-0000-0000-0000-000000000011', top_score: 8 },
        { id: '00000000-0000-0000-0000-000000000012', top_score: 1.6 },
      ];

      // Verify raw SQL calculations
      for (let i = 0; i < expectedResults.length; i++) {
        expect(rawResults[i].top_score).toBe(expectedResults[i].top_score);
      }
    } finally {
      // Clean up test data
      await dataSource.getRepository(ToDo).delete({ user_id: testUserId });
    }
  });
});
