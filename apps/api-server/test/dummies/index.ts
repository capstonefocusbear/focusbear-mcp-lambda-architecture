import { randomUUID } from 'crypto';
import { User as Auth0User } from 'auth0';
import { DateTime } from 'luxon';
import { CreateFocusModeTagDto } from 'apps/api-server/src/modules/focus-mode/dto/create-focus-mode-tag.dto';
import { FastifyRequest } from 'fastify';
import { CreateCompletedActivityDto } from '../../src/modules/activity/dto/create-completed-activity.dto';
import { DaysOfWeek } from '../../src/modules/activity/domain/days-of-week.enum';
import { ActivityPriority } from '../../src/modules/activity/domain/activity-priority.enum';
import { FocusModeTemplate } from '../../src/modules/focus-mode-template/entities/focus-mode-template.entity';
import { MarketplaceRequestType } from '../../src/modules/habit-pack/domain/marketplace-request.enum';
import { CompletedActivitySequence } from '../../src/modules/activity/entities/completed-activity-sequence.entity';
import { ActivityChoiceType } from '../../src/modules/activity/domain/activity-choice-type.enum';
import { SerializedActivity } from '../../src/modules/activity/services/activity-parser/activity-parser.service';
import { Passport } from '../../src/modules/auth/domain/passport.model';
import { User } from '../../src/modules/user/entities/user.entity';
import { ActivityType } from '../../src/modules/activity/domain/activity-type.enum';
import { Device } from '../../src/modules/device/entities/device.entity';
import { OperatingSystem } from '../../src/modules/device/domain/operating-system.enum';
import { ActivitySequence } from '../../src/modules/activity/entities/activity-sequence.entity';
import { Activity } from '../../src/modules/activity/entities/activity.entity';
import { LogSummaryType } from '../../src/modules/activity/domain/log-summary-type.enum';
import { ActivityData } from '../../src/modules/activity/domain/activity-data.model';
import { CompletedActivity } from '../../src/modules/activity/entities/completed-activity.entity';
import { FocusMode } from '../../src/modules/focus-mode/entities/focus-mode.entity';
import { CompletedFocusBlock } from '../../src/modules/focus-mode/entities/completed-focus-block.entity';
import { Team } from '../../src/modules/team/entities/team.entity';
import { UserTypes } from '../../src/modules/user/domain/user-types.enum';
import { FocusModeTag } from '../../src/modules/focus-mode/entities/focus-mode-tags';

export const authtorizedPassportDummy = new Passport({
  isAuth: true,
  user: { id: randomUUID() },
});

export const unthtorizedPassportDummy = new Passport({
  isAuth: false,
  declineReason: 'The Token expired!',
});

export const nonExistUserDummy = new User({
  id: '3a4f0bb1-5313-49da-9ae6-cc28e864763fh',
});

export const userDummy = new User(
  {
    id: '3a4f0bb1-5313-49da-9ae6-cc28e864763f',
    startup_time: '06:15',
    break_after_minutes: 15,
    shutdown_time: '20:30',
    auth0_id: '123dfewvwbt4de3e',
    user_type: UserTypes.STANDARD,
    timezone: 'UTC',
    username: 'someusername',
  },
  { generateId: false },
);

export const adminUserDummy = new User(
  {
    id: '7b4f0bb4-7521-85da-1ae2-cc28e864763e',
    startup_time: '06:15',
    break_after_minutes: 15,
    shutdown_time: '20:30',
    auth0_id: '123dfewvwbt4de3e',
    user_type: UserTypes.ADMIN,
    username: 'someusername',
  },
  { generateId: false },
);

export const auth0UserDummy: Auth0User = {
  _id: '1',
  email: 'some@email.com',
  email_verified: true,
};

export const deserializedActivitiesDummy = [
  {
    sequence: {
      id: '1293da0c-2055-4b30-9664-4736973e1dcf',
      type: 'morning',
      activity_ids: ['3f6b5a5a-a45d-4806-b4ae-2bfac3e38f14', 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1'],
      user_id: '3f6b5a5a-a45d-4806-b4ae-2bfac3e38f14',
      total_duration_seconds: 480,
    },
    activities: [
      {
        id: '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
        duration_seconds: 300,
        video_urls: [],
        name: 'Yoga',
        log_quantity: false,
      },
      {
        id: 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1',
        name: 'Journalling',
        video_urls: [],
        duration_seconds: 300,
      },
    ],
  },
  {
    sequence: {
      id: '555c587e-6c64-4c02-aeb0-61e015cc0290',
      type: 'evening',
      activity_ids: ['555c587e-6c64-4c02-aeb0-61e015cc0290'],
      user_id: '3f6b5a5a-a45d-4806-b4ae-2bfac3e38f14',
      total_duration_seconds: 720,
    },
    activities: [
      {
        id: '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
        duration_seconds: 300,
        video_urls: [],
        name: 'Yoga',
        log_quantity: false,
      },
      {
        id: 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1',
        name: 'Journalling',
        video_urls: [],
        duration_seconds: 300,
      },
    ],
  },
  {
    sequence: {
      id: 'c3b8e1f0-00b3-4283-b891-b1358a8743be',
      type: 'breaking',
      activity_ids: ['856eb9fb-8c12-418d-b12c-fec0f2dae49d', 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1'],
      user_id: '3f6b5a5a-a45d-4806-b4ae-2bfac3e38f14',
      total_duration_seconds: 60,
    },
    activities: [
      {
        id: '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
        duration_seconds: 300,
        video_urls: [],
        name: 'Yoga',
        log_quantity: false,
      },
      {
        id: 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1',
        name: 'Journalling',
        video_urls: [],
        duration_seconds: 300,
      },
    ],
  },
];

export const serializedActivityDummy: SerializedActivity = {
  morning_activities: [
    {
      id: '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
      duration_seconds: 300,
      video_urls: [],
      name: 'Yoga',
      log_quantity: false,
      is_default: true,
      log_quantity_questions: [
        {
          question: 'Test Question 1',
          min_value: 0,
          max_value: 10,
          min_value_description: 'Test min description',
          max_value_description: 'Test max description',
          log_summary_type: LogSummaryType.AVERAGE,
        },
      ],
    },
    {
      id: 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1',
      name: 'Journalling',
      video_urls: [],
      duration_seconds: 300,
      is_default: true,
    },
    {
      id: '3b57f802-23b0-47e2-a188-b07001db8e1f',
      duration_seconds: 180,
      video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
      name: 'Deep breathing',
      log_quantity: false,
      is_default: true,
    },
  ],
  evening_activities: [
    {
      id: '4b57f802-23b0-47e2-a188-b07001db8e1f',
      duration_seconds: 180,
      video_urls: [],
      name: 'Tidy up desk',
      log_quantity: false,
      is_default: true,
    },
    {
      id: '0b57f802-23b0-47e2-a188-b07001db8e1f',
      duration_seconds: 300,
      video_urls: [],
      name: 'Journal about day',
      log_quantity: false,
      is_default: true,
    },
    {
      id: '1b57f802-23b0-47e2-a188-b07001db8e1f',
      name: 'Plan to-do list and schedule for tomorrow',
      duration_seconds: 420,
      video_urls: [],
      is_default: true,
    },
  ],
  break_activities: [
    {
      id: '8b57f802-23b0-47e2-a188-b07001db8e1f',
      log_quantity_question: '',
      duration_seconds: 60,
      allowed_urls: [],
      include_in_every_break: false,
      is_default: true,
      choices: [
        {
          id: randomUUID(),
          name: 'Pushups',
          video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
          log_quantity: true,
          log_quantity_questions: [
            {
              question: 'Test Question 2',
              min_value: 0,
              max_value: 10,
              min_value_description: 'Test min description',
              max_value_description: 'Test max description',
              log_summary_type: LogSummaryType.AVERAGE,
            },
          ],
        },
        {
          id: randomUUID(),
          name: 'Situps',
          video_urls: [],
          log_quantity: true,
        },
        {
          id: randomUUID(),
          name: 'Squats',
          video_urls: [],
          log_quantity: true,
        },
        {
          id: randomUUID(),
          name: 'Lunges',
          video_urls: [],
          log_quantity: true,
        },
        {
          id: randomUUID(),
          name: 'Burpees',
          video_urls: [],
          log_quantity: true,
        },
        {
          id: randomUUID(),
          name: 'Plank',
          video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
          log_quantity: false,
        },
      ],
      allowed_apps: ['test app'],
      video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE', 'https://www.youtube.com/watch?v=W1I9M7g6VK8'],
      choice_type: ActivityChoiceType.random,
      name: 'Micro-workout',
      log_quantity: false,
    },
    {
      id: '7b57f802-23b0-47e2-a188-b07001db8e1f',
      duration_seconds: 20,
      include_in_every_break: true,
      video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
      name: 'Deep breathing',
      is_default: true,
    },
    {
      id: '6b57f802-23b0-47e2-a188-b07001db8e1f',
      duration_seconds: 40,
      video_urls: [],
      name: "Dance like no-one's watching",
      log_quantity: false,
      is_default: true,
    },
    {
      id: '5b57f802-23b0-47e2-a188-b07001db8e1f',
      choices: [
        {
          id: randomUUID(),
          video_urls: ['https://www.youtube.com/watch?v=xcrc5wTZwNk'],
          log_quantity_question: 'choice djdjdjd',
          name: 'Choice',
          log_quantity: true,
        },
        {
          id: randomUUID(),
          video_urls: [],
          log_quantity_question: 'sdcsdc',
          name: 'some name',
          log_quantity: true,
        },
      ],
      duration_seconds: 60,
      include_in_every_break: false,
      allowed_apps: [],
      video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
      log_quantity: true,
      name: 'test ',
      log_quantity_question: '',
      is_default: true,
    },
  ],
};

export const serializedActivityDummyWithDefaultActivities: SerializedActivity = {
  morning_activities: [
    {
      id: '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
      duration_seconds: 300,
      video_urls: [],
      name: 'Yoga',
      log_quantity: false,
      is_default: true,
    },
    {
      id: '3b57f802-23b0-47e2-a188-b07001db8e1f',
      duration_seconds: 180,
      video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
      name: 'Deep breathing',
      log_quantity: false,
      is_default: false,
    },
  ],
  evening_activities: [
    {
      id: '1b57f802-23b0-47e2-a188-b07001db8e1f',
      name: 'Plan to-do list and schedule for tomorrow',
      duration_seconds: 420,
      video_urls: [],
      is_default: true,
    },
  ],
  break_activities: [
    {
      id: '7b57f802-23b0-47e2-a188-b07001db8e1f',
      duration_seconds: 20,
      include_in_every_break: true,
      video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
      name: 'Deep breathing',
      is_default: true,
    },
    {
      id: '6b57f802-23b0-47e2-a188-b07001db8e1f',
      duration_seconds: 40,
      video_urls: [],
      name: "Dance like no-one's watching",
      log_quantity: false,
      is_default: false,
    },
  ],
};

export const userSettingsDBResponseDummy = {
  id: 'e1477f9a-515f-49f5-be2b-0c39af087324',
  startup_time: '06:15',
  shutdown_time: '20:30',
  break_after_minutes: 15,
  activity_sequences: [
    {
      id: '60621532-b71b-49fd-a6ed-efeb6ba19209',
      type: ActivityType.morning,
      activity_ids: [
        '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
        'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1',
        '3b57f802-23b0-47e2-a188-b07001db8e1f',
      ],
      activities: [
        {
          id: 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1',
          activity_data: {
            name: 'Journalling',
            video_urls: [],
            duration_seconds: 300,
          },
        },
        {
          id: '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
          activity_data: {
            name: 'Yoga',
            video_urls: [],
            log_quantity: false,
            duration_seconds: 300,
          },
        },
        {
          id: '3b57f802-23b0-47e2-a188-b07001db8e1f',
          activity_data: {
            name: 'Deep breathing',
            video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
            log_quantity: false,
            duration_seconds: 180,
          },
        },
      ],
    },
    {
      id: '629247b9-caed-4262-a69a-10c25d25dc07',
      type: ActivityType.evening,
      activity_ids: [
        '4b57f802-23b0-47e2-a188-b07001db8e1f',
        '0b57f802-23b0-47e2-a188-b07001db8e1f',
        '1b57f802-23b0-47e2-a188-b07001db8e1f',
      ],
      activities: [
        {
          id: '4b57f802-23b0-47e2-a188-b07001db8e1f',
          activity_data: {
            name: 'Tidy up desk',
            video_urls: [],
            log_quantity: false,
            duration_seconds: 180,
          },
        },
        {
          id: '0b57f802-23b0-47e2-a188-b07001db8e1f',
          activity_data: {
            name: 'Journal about day',
            video_urls: [],
            log_quantity: false,
            duration_seconds: 300,
          },
        },
        {
          id: '1b57f802-23b0-47e2-a188-b07001db8e1f',
          activity_data: {
            name: 'Plan to-do list and schedule for tomorrow',
            video_urls: [],
            duration_seconds: 420,
          },
        },
      ],
    },
    {
      id: '066d3712-16b8-49c2-98a7-7187ad385e4b',
      type: ActivityType.break,
      activity_ids: [
        '8b57f802-23b0-47e2-a188-b07001db8e1f',
        '7b57f802-23b0-47e2-a188-b07001db8e1f',
        '6b57f802-23b0-47e2-a188-b07001db8e1f',
        '5b57f802-23b0-47e2-a188-b07001db8e1f',
      ],
      activities: [
        {
          id: '8b57f802-23b0-47e2-a188-b07001db8e1f',
          activity_data: {
            name: 'Micro-workout',
            choices: [
              {
                name: 'Pushups',
                video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
                log_quantity: true,
              },
              {
                name: 'Situps',
                video_urls: [],
                log_quantity: true,
              },
              {
                name: 'Squats',
                video_urls: [],
                log_quantity: true,
              },
              {
                name: 'Lunges',
                video_urls: [],
                log_quantity: true,
              },
              {
                name: 'Burpees',
                video_urls: [],
                log_quantity: true,
              },
              {
                name: 'Plank',
                video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
                log_quantity: false,
              },
            ],
            video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE', 'https://www.youtube.com/watch?v=W1I9M7g6VK8'],
            choice_type: ActivityChoiceType.random,
            allowed_apps: ['test app'],
            allowed_urls: [],
            log_quantity: false,
            duration_seconds: 60,
            log_quantity_question: '',
            include_in_every_break: false,
          },
        },
        {
          id: '7b57f802-23b0-47e2-a188-b07001db8e1f',
          activity_data: {
            name: 'Deep breathing',
            video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
            duration_seconds: 20,
            include_in_every_break: true,
          },
        },
        {
          id: '6b57f802-23b0-47e2-a188-b07001db8e1f',
          activity_data: {
            name: "Dance like no-one's watching",
            video_urls: [],
            log_quantity: false,
            duration_seconds: 40,
          },
        },
        {
          id: '5b57f802-23b0-47e2-a188-b07001db8e1f',
          activity_data: {
            name: 'test ',
            choices: [
              {
                name: 'Choice',
                video_urls: ['https://www.youtube.com/watch?v=xcrc5wTZwNk'],
                log_quantity: true,
                log_quantity_question: 'choice djdjdjd',
              },
              {
                name: 'some name',
                video_urls: [],
                log_quantity: true,
                log_quantity_question: 'sdcdsc',
              },
            ],
            video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
            allowed_apps: [],
            log_quantity: true,
            duration_seconds: 60,
            log_quantity_question: 'Log quantity data?',
            include_in_every_break: false,
          },
        },
      ],
    },
  ],
};

export const DeviceDummy = new Device(
  {
    operating_system: OperatingSystem.Android,
    user_id: userDummy.id,
    is_leader: false,
    id: 'cbe82b55-b694-4016-ad0b-7961c09a8854',
  },
  { generateId: false },
);

export const LeaderDeviceDummy = new Device(
  {
    operating_system: OperatingSystem.iOS,
    is_leader: true,
  },
  { generateId: true },
);

export const UserDevicesListDummy: Device[] = [DeviceDummy, LeaderDeviceDummy];

export const ActivitySequenceDummy = new ActivitySequence(
  {
    type: ActivityType.morning,
    activity_ids: new Array(3).fill(null).map(() => randomUUID()),
    user_id: userDummy.id,
    total_duration_seconds: 360,
  },
  { generateId: true },
);

export const ActivityDummy: Activity = new Activity(
  {
    user_id: userDummy.id,
    type: ActivityType.evening,
    log_summary_type: LogSummaryType.SUM,
    log_quantity: true,
    duration_seconds: 600,
    activity_data: new ActivityData(),
    activity_sequence_id: ActivitySequenceDummy.id,
    days_of_week: [DaysOfWeek.ALL],
  },
  { generateId: true },
);

export const ActivityDummyWithCompetencyChoices: Activity = new Activity(
  {
    user_id: userDummy.id,
    type: ActivityType.evening,
    log_summary_type: LogSummaryType.SUM,
    log_quantity: true,
    duration_seconds: 600,
    activity_data: new ActivityData({ current_competency_level: 1, choice_type: ActivityChoiceType.competency }),
    activity_sequence_id: ActivitySequenceDummy.id,
    days_of_week: [DaysOfWeek.ALL],
    choices: [
      new Activity({ id: randomUUID(), activity_data: { name: 'CC 1', competency_level: 1 } }),
      new Activity({ id: randomUUID(), activity_data: { name: 'CC 2', competency_level: 1 } }),
    ],
  },
  { generateId: true },
);

export const logQuantityAnswersDtoDummy = [
  { question_id: randomUUID(), logged_value: 5 },
  { question_id: randomUUID(), logged_value: 8 },
];

export const logQuantityAnswerDummy = {
  id: randomUUID(),
  created_at: new Date(),
  updated_at: new Date(),
  user_id: userDummy.id,
  activity_id: ActivityDummy.id,
  question_id: randomUUID(),
  completed_activity_log_id: randomUUID(),
  logged_value: 5,
  date_logged: new Date(),
};

const completedActivity: CreateCompletedActivityDto = {
  activity_id: ActivityDummy.id,
  quantity_logged: 10,
  duration_logged: 600,
  note_logged: 'some text',
  device_id: DeviceDummy.id,
  activity_sequence_id: ActivityDummy.activity_sequence_id,
  start_time: new Date(Date.now() - 60),
  finish_time: new Date(Date.now() - 1),
  metadata: { is_skipped: false },
};

export const createdLogQuantityAnswerDummies = [
  {
    id: randomUUID(),
    activity_id: completedActivity.activity_id,
    question_id: logQuantityAnswersDtoDummy[0].question_id,
    logged_value: logQuantityAnswersDtoDummy[0].logged_value,
    user_id: userDummy.id,
    date_logged: completedActivity.start_time,
    completed_activity_log_id: randomUUID(),
  },
  {
    id: randomUUID(),
    activity_id: completedActivity.activity_id,
    question_id: logQuantityAnswersDtoDummy[1].question_id,
    logged_value: logQuantityAnswersDtoDummy[1].logged_value,
    user_id: userDummy.id,
    date_logged: completedActivity.start_time,
    completed_activity_log_id: randomUUID(),
  },
];

const sequenceId = randomUUID();
const firstActivityId = randomUUID();
const secondActivityId = randomUUID();
const thirdActivityId = randomUUID();

export const ActivitySequenceWithHighPriorityActivitiesDummy = {
  id: sequenceId,
  type: ActivityType.morning,
  activity_ids: [firstActivityId, secondActivityId, thirdActivityId],
  sequenceActivityIds: [firstActivityId, secondActivityId, thirdActivityId],
  user_id: userDummy.id,
  total_duration_seconds: 360,
  activities: [
    {
      ...ActivityDummy,
      id: firstActivityId,
      activity_sequence_id: sequenceId,
      activity_data: { priority: ActivityPriority.STANDARD },
      days_of_week: [DaysOfWeek.ALL],
    },
    {
      ...ActivityDummy,
      id: secondActivityId,
      activity_sequence_id: sequenceId,
      activity_data: { priority: ActivityPriority.STANDARD },
      days_of_week: [DaysOfWeek.ALL],
    },
    {
      ...ActivityDummy,
      id: thirdActivityId,
      activity_sequence_id: sequenceId,
      activity_data: { priority: ActivityPriority.HIGH },
      days_of_week: [DaysOfWeek.ALL],
    },
  ],
};

export const ActivitySequenceWithoutHighPriorityActivitiesDummy = {
  id: sequenceId,
  type: ActivityType.morning,
  activity_ids: [firstActivityId, secondActivityId, thirdActivityId],
  sequenceActivityIds: [firstActivityId, secondActivityId, thirdActivityId],
  user_id: userDummy.id,
  total_duration_seconds: 360,
  activities: [
    {
      ...ActivityDummy,
      id: firstActivityId,
      activity_sequence_id: sequenceId,
      activity_data: { priority: ActivityPriority.STANDARD, name: 'Test Name' },
      days_of_week: [DaysOfWeek.ALL],
    },
    {
      ...ActivityDummy,
      id: secondActivityId,
      activity_sequence_id: sequenceId,
      activity_data: { priority: ActivityPriority.STANDARD, name: 'Test Name' },
      days_of_week: [DaysOfWeek.ALL],
    },
    {
      ...ActivityDummy,
      id: thirdActivityId,
      activity_sequence_id: sequenceId,
      activity_data: { priority: ActivityPriority.STANDARD, name: 'Test Name' },
      days_of_week: [DaysOfWeek.ALL],
    },
  ],
};

export const CompletedActivitiesForSequenceDummy = (sequence: ActivitySequence): CompletedActivity[] => {
  const duration_logged = 60000;
  return sequence.sequenceActivityIds.map(
    (e, i) =>
      new CompletedActivity(
        {
          activity_id: e,
          activity_sequence_id: sequence.id,
          quantity_logged: 50,
          duration_logged,
          start_time: new Date(Date.now() + i * duration_logged),
          finish_time: new Date(Date.now() + i * duration_logged + duration_logged),
        },
        {
          generateId: true,
          log_quantity: true,
        },
      ),
  );
};

export const CompletedActivityDummy = new CompletedActivity(
  {
    activity_id: ActivityDummy.id,
    activity: ActivityDummy,
    activity_sequence_id: ActivityDummy.activity_sequence_id,
    quantity_logged: 50,
    duration_logged: 13,
    start_time: new Date(Date.now() - 50 * 1000),
    finish_time: new Date(),
    answers: [],
  },
  {
    generateId: true,
    log_quantity: true,
  },
);

export const ActivitiesArrayDummy: SerializedActivity = {
  morning_activities: [
    {
      id: '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
      duration_seconds: 300,
      video_urls: [],
      name: 'Yoga',
      log_quantity: false,
      is_default: true,
      days_of_week: [DaysOfWeek.ALL],
    },
    {
      id: 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1',
      name: 'Journalling',
      video_urls: [],
      duration_seconds: 300,
      is_default: true,
      days_of_week: [DaysOfWeek.ALL],
    },
  ],
  evening_activities: [
    {
      id: '5c51f789-4563-4e74-a15d-9e17e3d15d06',
      duration_seconds: 180,
      video_urls: [],
      name: 'Tidy up desk',
      log_quantity: false,
      is_default: true,
      days_of_week: [DaysOfWeek.ALL],
      priority: ActivityPriority.STANDARD,
    },
    {
      id: '2c4af789-4563-4e74-a15d-9e17e3d15d06',
      duration_seconds: 300,
      video_urls: [],
      name: 'Journal about day',
      log_quantity: false,
      is_default: true,
      days_of_week: [DaysOfWeek.ALL],
      priority: ActivityPriority.HIGH,
    },
  ],
};

export const eveningActivitiesDBResponseDummy = [
  {
    id: '5c51f789-4563-4e74-a15d-9e17e3d15d06',
    duration_seconds: 180,
    is_default: true,
    days_of_week: [DaysOfWeek.ALL],
    activity_data: {
      priority: ActivityPriority.STANDARD,
      video_urls: [],
      name: 'Tidy up desk',
      log_quantity: false,
    },
  },
  {
    id: '2c4af789-4563-4e74-a15d-9e17e3d15d06',
    duration_seconds: 300,
    log_quantity: false,
    is_default: true,
    days_of_week: [DaysOfWeek.ALL],
    activity_data: {
      priority: ActivityPriority.HIGH,
      video_urls: [],
      name: 'Journal about day',
    },
  },
];

const morningSequenceId = 'cfaf3dbf-b555-430e-810d-d7643d97c0f4';

export const MorningActivitySequenceDummy = new ActivitySequence(
  {
    type: ActivityType.morning,
    activity_ids: ['856eb9fb-8c12-418d-b12c-fec0f2dae49d', 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1'],
    activities: ActivitiesArrayDummy.morning_activities,
    user_id: userDummy.id,
    total_duration_seconds: 360,
    id: morningSequenceId,
  },
  { generateId: false },
);

export const sequenceWithActivitiesForDifferentDays = new ActivitySequence(
  {
    type: ActivityType.morning,
    activity_ids: [
      '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
      'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1',
      '5c51f789-4563-4e74-a15d-9e17e3d15d06',
    ],
    activities: [
      new Activity({
        id: '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
        activity_sequence_id: morningSequenceId,
        days_of_week: [DaysOfWeek.MON],
      }),
      new Activity({
        id: 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1',
        activity_sequence_id: morningSequenceId,
        days_of_week: [DaysOfWeek.TUE],
      }),
      new Activity({
        id: '5c51f789-4563-4e74-a15d-9e17e3d15d06',
        activity_sequence_id: morningSequenceId,
        days_of_week: [DaysOfWeek.MON],
      }),
    ],
    user_id: userDummy.id,
    total_duration_seconds: 360,
    id: morningSequenceId,
  },
  { generateId: false },
);

export const EveningActivitySequenceDummy = new ActivitySequence(
  {
    type: ActivityType.evening,
    activity_ids: ['5c51f789-4563-4e74-a15d-9e17e3d15d06', '2c4af789-4563-4e74-a15d-9e17e3d15d06'],
    activities: eveningActivitiesDBResponseDummy,
    user_id: userDummy.id,
    total_duration_seconds: 360,
    id: 'aevf3dbf-c777-271e-912e-d7643d97a6ce',
  },
  { generateId: false },
);

export const completedActivitiesArrayDummy = [
  {
    activity_id: '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
    device_id: DeviceDummy.id,
    activity_sequence_id: MorningActivitySequenceDummy.id,
    quantity_logged: 15,
    duration_logged: 120,
    start_time: new Date('2022-12-10T12:21:14+0000'),
  },
  {
    activity_id: 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1',
    device_id: DeviceDummy.id,
    activity_sequence_id: MorningActivitySequenceDummy.id,
    quantity_logged: 15,
    duration_logged: 120,
    start_time: new Date('2022-12-10T12:21:14+0000'),
  },
  {
    activity_id: '5c51f789-4563-4e74-a15d-9e17e3d15d06',
    device_id: DeviceDummy.id,
    activity_sequence_id: EveningActivitySequenceDummy.id,
    quantity_logged: 15,
    duration_logged: 120,
    start_time: new Date('2022-12-12T12:21:14+0000'),
  },
  {
    activity_id: '2c4af789-4563-4e74-a15d-9e17e3d15d06',
    device_id: DeviceDummy.id,
    activity_sequence_id: EveningActivitySequenceDummy.id,
    quantity_logged: 15,
    duration_logged: 120,
    start_time: new Date('2022-12-13T12:21:14+0000'),
  },
];

export const compledtedActivitiesSortedByIdDummy = {
  'cfaf3dbf-b555-430e-810d-d7643d97c0f4': [
    {
      activity_id: '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
      device_id: DeviceDummy.id,
      activity_sequence_id: MorningActivitySequenceDummy.id,
      quantity_logged: 15,
      duration_logged: 120,
      start_time: new Date('2022-12-10T12:21:14.000Z'),
    },
    {
      activity_id: 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1',
      device_id: DeviceDummy.id,
      activity_sequence_id: MorningActivitySequenceDummy.id,
      quantity_logged: 15,
      duration_logged: 120,
      start_time: new Date('2022-12-10T12:21:14.000Z'),
    },
  ],
  'aevf3dbf-c777-271e-912e-d7643d97a6ce': [
    {
      activity_id: '5c51f789-4563-4e74-a15d-9e17e3d15d06',
      device_id: DeviceDummy.id,
      activity_sequence_id: EveningActivitySequenceDummy.id,
      quantity_logged: 15,
      duration_logged: 120,
      start_time: new Date('2022-12-12T12:21:14.000Z'),
    },
    {
      activity_id: '2c4af789-4563-4e74-a15d-9e17e3d15d06',
      device_id: DeviceDummy.id,
      activity_sequence_id: EveningActivitySequenceDummy.id,
      quantity_logged: 15,
      duration_logged: 120,
      start_time: new Date('2022-12-13T12:21:14+0000'),
    },
  ],
};

export const compledtedActivitiesSortedByDateAndIdDummy = [
  {
    'cfaf3dbf-b555-430e-810d-d7643d97c0f4': [
      {
        activity_id: '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
        device_id: DeviceDummy.id,
        activity_sequence_id: MorningActivitySequenceDummy.id,
        quantity_logged: 15,
        duration_logged: 120,
        start_time: new Date('2022-12-10T12:21:14.000Z'),
      },
      {
        activity_id: 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1',
        device_id: DeviceDummy.id,
        activity_sequence_id: MorningActivitySequenceDummy.id,
        quantity_logged: 15,
        duration_logged: 120,
        start_time: new Date('2022-12-10T12:21:14.000Z'),
      },
    ],
  },
  {
    'aevf3dbf-c777-271e-912e-d7643d97a6ce': [
      {
        activity_id: '5c51f789-4563-4e74-a15d-9e17e3d15d06',
        device_id: DeviceDummy.id,
        activity_sequence_id: EveningActivitySequenceDummy.id,
        quantity_logged: 15,
        duration_logged: 120,
        start_time: new Date('2022-12-12T12:21:14.000Z'),
      },
    ],
  },
  {
    'aevf3dbf-c777-271e-912e-d7643d97a6ce': [
      {
        activity_id: '2c4af789-4563-4e74-a15d-9e17e3d15d06',
        device_id: DeviceDummy.id,
        activity_sequence_id: EveningActivitySequenceDummy.id,
        quantity_logged: 15,
        duration_logged: 120,
        start_time: new Date('2022-12-13T12:21:14+0000'),
      },
    ],
  },
];

export const completedActivitiesWithNotesDummyArray = [
  {
    id: '1026fb59-f854-42de-8f53-a4c9c750bebd',
    user_id: userDummy.id,
    activity_id: '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
    device_id: DeviceDummy.id,
    activity_sequence_id: MorningActivitySequenceDummy.id,
    quantity_logged: 15,
    duration_logged: 120,
    start_time: new Date('2022-12-10T12:21:14+0000'),
    activity_note: 'Test Note One',
    activity: { ...ActivityDummy, activity_data: new ActivityData({ name: 'Dummy One' }) },
  },
  {
    id: '2036fb59-o054-12de-8f22-a4c9c9908oae',
    user_id: userDummy.id,
    activity_id: 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1',
    device_id: DeviceDummy.id,
    activity_sequence_id: MorningActivitySequenceDummy.id,
    quantity_logged: 15,
    duration_logged: 120,
    start_time: new Date('2022-12-10T12:21:14+0000'),
    activity_note: 'Test Note Two',
    activity: { ...ActivityDummy, activity_data: new ActivityData({ name: 'Dummy Two' }) },
  },
];

const tagIdDummy = randomUUID();
export const FocusModeTagsDtoDummy: CreateFocusModeTagDto[] = [{ id: tagIdDummy, text: 'Test Tag' }];
export const FocusModeTagsDummy = [new FocusModeTag({ id: tagIdDummy, text: 'Test Tag' })];

export const FocusModeDummy = new FocusMode(
  {
    user_id: userDummy.id,
    name: 'Some string value',
    allowed_apps: [],
    allowed_urls: [],
    tags: [],
  },
  { generateId: true },
);

export const UpsertFocusModeDummy = {
  id: randomUUID(),
  user_id: userDummy.id,
  name: 'Some string value',
  allowed_apps: [],
  allowed_urls: [],
  tags: [],
};

export const CompletedFocusBlockDummy = new CompletedFocusBlock(
  {
    user_id: FocusModeDummy.user_id,
    focus_mode_id: FocusModeDummy.id,
    focus_mode: FocusModeDummy,
    finish_time: new Date(Date.now() + 1000 * 60 * 60),
    scheduled_finish_time: new Date(Date.now() + 1000 * 60 * 60),
    start_time: new Date(),
    intention: 'Some string',
    achievements: 'Some string',
    distractions: 'Test string',
    focus_duration_seconds: 3200,
  },
  { generateId: true },
);

export const UncompletedSequenceLogDummy = new CompletedActivitySequence({
  activity_sequence_id: ActivitySequenceDummy.id,
  activity_sequence: ActivitySequenceDummy,
  user_id: userDummy.id,
  start_time: new Date(),
  is_completed: false,
  completed_activity_logs: CompletedActivitiesForSequenceDummy(ActivitySequenceDummy),
});

export const CompletedSequenceLogDummy = new CompletedActivitySequence({
  activity_sequence_id: ActivitySequenceDummy.id,
  user_id: userDummy.id,
  start_time: new Date(),
  is_completed: true,
  completed_activity_logs: CompletedActivitiesForSequenceDummy(ActivitySequenceDummy),
});

export const TeamWithMembersDummy = new Team({
  owner_id: userDummy.id,
  owner: userDummy,
  is_active: true,
  team_size: 5,
  members: [userDummy],
});

export const TeamMemberDummy = new User({
  ...userDummy,
  id: randomUUID(),
  member_of_team_id: TeamWithMembersDummy.id,
  member_of_team: TeamWithMembersDummy,
});

TeamWithMembersDummy.members.push(TeamMemberDummy);

export const pusherBeamsPublishRequestDummy = {
  apns: {
    aps: {},
    data: {
      pushData: {
        achievements: 'Some string',
        finish_time: '2022-10-10T04:21:46.269Z',
        focus_mode: {
          allowed_apps: [],
          allowed_urls: [],
          id: '7a9368e1-9b80-462f-9975-ab29e9b2f171',
          name: 'Some string value',
          user_id: 'f7aa0206-e3bc-4057-a3ab-6e387dd4107a',
        },
        focus_mode_id: '4429522e-fb45-494d-8d2b-26b14a005aea',
        id: 'f8f763de-ab61-4e61-9d8f-16c14982edf4',
        intention: 'Some string',
        is_finished: true,
        scheduled_finish_time: '2022-10-10T04:21:46.269Z',
        start_time: '2022-10-10T03:38:11.892Z',
        user_id: '1026fb59-f854-42de-8f53-a4c9c750bebd',
      },
    },
  },
  fcm: {
    data: {
      pushData: {
        achievements: 'Some string',
        finish_time: '2022-10-10T04:21:46.269Z',
        focus_mode: {
          allowed_apps: [],
          allowed_urls: [],
          id: '7a9368e1-9b80-462f-9975-ab29e9b2f171',
          name: 'Some string value',
          user_id: 'f7aa0206-e3bc-4057-a3ab-6e387dd4107a',
        },
        focus_mode_id: '4429522e-fb45-494d-8d2b-26b14a005aea',
        id: 'f8f763de-ab61-4e61-9d8f-16c14982edf4',
        intention: 'Some string',
        is_finished: true,
        scheduled_finish_time: '2022-10-10T04:21:46.269Z',
        start_time: '2022-10-10T03:38:11.892Z',
        user_id: '1026fb59-f854-42de-8f53-a4c9c750bebd',
      },
    },
  },
};

export const pusherBeamsFocusModeDummy = new FocusMode(
  {
    id: '7a9368e1-9b80-462f-9975-ab29e9b2f171',
    user_id: 'f7aa0206-e3bc-4057-a3ab-6e387dd4107a',
    name: 'Some string value',
    allowed_apps: [],
    allowed_urls: [],
  },
  { generateId: false },
);

export const pusherBeamsPublishRequestFocusBlockDummy = new CompletedFocusBlock(
  {
    id: 'f8f763de-ab61-4e61-9d8f-16c14982edf4',
    user_id: '1026fb59-f854-42de-8f53-a4c9c750bebd',
    focus_mode_id: '4429522e-fb45-494d-8d2b-26b14a005aea',
    focus_mode: pusherBeamsFocusModeDummy,
    finish_time: new Date('2022-10-10T04:21:46.269Z'),
    scheduled_finish_time: new Date('2022-10-10T04:21:46.269Z'),
    start_time: new Date('2022-10-10T03:38:11.892Z'),
    intention: 'Some string',
    achievements: 'Some string',
  },
  { generateId: false },
);

export const userSettingsDummy = {
  has_edited_settings: false,
  startup_time: '06:15',
  shutdown_time: '20:30',
  break_after_minutes: 15,
  break_activities: [
    {
      id: '666da3c5-50b7-4205-a481-13b402de53d6',
      choices: [
        {
          id: '310b74aa-d6c2-4153-93f1-dab6cd1db49a',
          duration_seconds: 30,
          log_quantity: true,
          log_summary_type: LogSummaryType.SUM,
          name: 'Pushups',
          video_urls: ['https://www.youtube.com/watch?v=StXac04arIc', 'https://www.youtube.com/watch?v=dOY-VkXbJCY'],
        },
      ],
      duration_seconds: 30,
      activity_sequence_id: 'c3b8e1f0-00b3-4283-b891-b1358a8743be',
      log_quantity: false,
      log_summary_type: LogSummaryType.SUM,
      name: 'Micro-workout',
      is_office_friendly: false,
      video_urls: [],
      allowed_apps: [],
      include_in_every_break: true,
      log_quantity_question: '',
      choice_type: ActivityChoiceType.random,
      allowed_urls: [],
    },
  ],
  morning_activities: [
    {
      id: 'a4758757-5894-46c6-9f33-a081a351a2f6',
      choices: [],
      duration_seconds: 180,
      activity_sequence_id: '1293da0c-2055-4b30-9664-4736973e1dcf',
      log_quantity: false,
      log_summary_type: LogSummaryType.SUM,
      name: 'Deep breathing',
      video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
    },
  ],
  evening_activities: [
    {
      id: 'daec162d-dedf-45fb-81af-6c55e9394668',
      choices: [],
      duration_seconds: 300,
      activity_sequence_id: '555c587e-6c64-4c02-aeb0-61e015cc0290',
      log_quantity: false,
      log_summary_type: LogSummaryType.SUM,
      name: 'Journal about day',
      video_urls: [],
    },
  ],
};

export const localDeviceSettingsDummy = {
  Android: '...',
  MacOS: '...',
  Windows: '...',
  iOS: '...',
  Web: { hasEditedSettings: false },
};

export const brevoEventDummy = {
  event_type: 'test-event',
  user_properties: { first_name: 'Some name', last_name: 'some last name' },
  event_data: { id: 'eventId-123', data: { example_key: 'example-value' } },
};

export const updateCalendarEventDummy = {
  id: '7a5f0bb2-5313-49da-9ae6-cc28e869014u',
  external_id: '12345',
  summary: 'Radom text...',
  description: 'More random text',
  event_begins: new Date(),
  event_ends: new Date(),
  is_dismissed: true,
  dismiss_reason: 'Noted',
  received: true,
};

export const createCalendarEventDummy = {
  external_id: '12345',
  summary: 'Radom text...',
  description: 'More random text',
  event_begins: new Date(),
  event_ends: new Date(),
  is_dismissed: false,
  dismiss_reason: '',
  received: false,
};

export const notificationDBResponseDummy = {
  id: '7a5f0bb2-5313-49da-9ae6-cc28e869014u',
  user_id: '3a4f0bb1-5313-49da-1ef2-cc28e864763f',
  summary: 'Radom text...',
  description: 'More random text',
  external_id: '12345',
  event_begins: '2022-10-31T03:45:29.198Z',
  event_ends: '2022-10-31T03:45:29.198Z',
  is_dismissed: false,
  dismiss_reason: '',
  received: false,
};

export const videoUrlsDummy = [
  'https://www.youtube.com/watch?v=EL1wNBsEHiY',
  'https://www.youtube.com/watch?v=R0Ut6nldt9g',
  'https://youtu.be/KLKn9kA5t58',
];

export const videoUrlsWithInvalidURLDummy = [
  'https://www.youtube.com/watch?v=EL1wNBsEHiY',
  'https://www.youtube.com/watch?v=R0Ut6nldt9g',
  'https://youtu.be/KLKn9kA5t58',
  'https://youtu.be/12345n9kA5t13',
];

export const videoMetadataRepositoryResponseDummy = [
  {
    id: 'EL1wNBsEHiY',
    created_at: '2022-12-07T07:23:21.893Z',
    updated_at: '2022-12-07T07:23:21.893Z',
    video_url: 'https://www.youtube.com/watch?v=EL1wNBsEHiY',
    title: 'Microworkout: 1 minute of Squats',
    duration: '0:00:46',
  },
  {
    id: 'R0Ut6nldt9g',
    created_at: '2022-12-07T07:23:21.896Z',
    updated_at: '2022-12-07T07:23:21.896Z',
    video_url: 'https://www.youtube.com/watch?v=R0Ut6nldt9g',
    title: 'Microworkout: 30 seconds of squats',
    duration: '0:00:43',
  },
  {
    id: 'KLKn9kA5t58',
    created_at: '2022-12-07T10:43:02.450Z',
    updated_at: '2022-12-07T10:43:02.450Z',
    video_url: 'https://youtu.be/KLKn9kA5t58',
    title: 'Productivity tips: Pomodoro technique with Focus Bear',
    duration: '0:06:40',
  },
];

export const videoMetadataReturnValueDummy = {
  videos_metadata: [
    {
      id: 'EL1wNBsEHiY',
      video_url: 'https://www.youtube.com/watch?v=EL1wNBsEHiY',
      title: 'Microworkout: 1 minute of Squats',
      duration: '0:00:46',
    },
    {
      id: 'R0Ut6nldt9g',
      video_url: 'https://www.youtube.com/watch?v=R0Ut6nldt9g',
      title: 'Microworkout: 30 seconds of squats',
      duration: '0:00:43',
    },
    {
      id: 'KLKn9kA5t58',
      video_url: 'https://youtu.be/KLKn9kA5t58',
      title: 'Productivity tips: Pomodoro technique with Focus Bear',
      duration: '06:40',
    },
  ],
};

export const videoMetadataReturnValueWithInvalidURLDummy = {
  videos_metadata: [
    {
      id: 'EL1wNBsEHiY',
      video_url: 'https://www.youtube.com/watch?v=EL1wNBsEHiY',
      title: 'Microworkout: 1 minute of Squats',
      duration: '0:00:46',
    },
    {
      id: 'R0Ut6nldt9g',
      video_url: 'https://www.youtube.com/watch?v=R0Ut6nldt9g',
      title: 'Microworkout: 30 seconds of squats',
      duration: '0:00:43',
    },
    {
      id: 'KLKn9kA5t58',
      video_url: 'https://youtu.be/KLKn9kA5t58',
      title: 'Productivity tips: Pomodoro technique with Focus Bear',
      duration: '06:40',
    },
  ],
  invalid_urls: ['https://youtu.be/12345n9kA5t13'],
};

export const videoMetadataYoutubeAPIResponseDummy = {
  data: {
    items: [
      {
        snippet: {
          title: 'Productivity tips: Pomodoro technique with Focus Bear',
        },
        contentDetails: {
          duration: 'PT06M40S',
        },
      },
    ],
    pageInfo: {
      totalResults: 1,
    },
  },
};

export const videoMetadataRepositoryDBResponseDummy = [
  {
    id: 'EL1wNBsEHiY',
    created_at: '2022-12-07T07:23:21.893Z',
    updated_at: '2022-12-07T07:23:21.893Z',
    video_url: 'https://www.youtube.com/watch?v=EL1wNBsEHiY',
    title: 'Microworkout: 1 minute of Squats',
    duration: '0:00:46',
  },
  {
    id: 'R0Ut6nldt9g',
    created_at: '2022-12-07T07:23:21.896Z',
    updated_at: '2022-12-07T07:23:21.896Z',
    video_url: 'https://www.youtube.com/watch?v=R0Ut6nldt9g',
    title: 'Microworkout: 30 seconds of squats',
    duration: '0:00:43',
  },
];

export const trackDtoDummy = {
  id: '0775e6be-61d7-4e63-942f-1131ad4dbf46',
  name: 'Dummy Track',
  artist: 'Dummy artist',
  description: 'Some text description',
  file_name: 'demo-track.mp3',
  thumbnail_file_name: 'focus-bear-icon.png',
  duration: 5400,
};

export const focusModeTemplateDBResponseDummy: FocusModeTemplate = {
  id: randomUUID(),
  author_id: userDummy.id,
  name: 'Test Focus Mode Template',
  description: 'Text description',
  description_video_url: 'www.bah.com',
  welcome_message: 'Welcome message text',
  welcome_video_url: 'https:blah.io',
  marketplace_request: MarketplaceRequestType.requested,
  marketplace_approval_status: false,
  allowed_apps: [],
  allowed_urls: [],
  language: 'en',
  tags: [
    new FocusModeTag({ id: randomUUID(), text: 'Test Tag' }),
    new FocusModeTag({ id: randomUUID(), text: 'Test Tag 2' }),
  ],
};

const latestDateInStatsStreak = DateTime.fromMillis(1676254469000).startOf('day');

export const dailyStatsArrayDummy = [
  {
    id: randomUUID(),
    user_id: userDummy.id,
    date_completed: latestDateInStatsStreak.toJSDate(),
    morning_routine_completion_percentage: 60,
    evening_routine_completion_percentage: 70,
    focus_modes_completed: 7,
    should_recalculate: false,
    morning_sequence_log_id: null,
    evening_sequence_log_id: randomUUID(),
  },
  // this stat is mocked to fall over a weekend and has no completed focus modes
  // to test streak not being reset if FM not done over weekend
  {
    id: randomUUID(),
    user_id: userDummy.id,
    date_completed: latestDateInStatsStreak.minus({ days: 1 }).toJSDate(),
    morning_routine_completion_percentage: 60,
    evening_routine_completion_percentage: 70,
    focus_modes_completed: 0,
    should_recalculate: false,
    morning_sequence_log_id: null,
    evening_sequence_log_id: randomUUID(),
  },
  {
    id: randomUUID(),
    user_id: userDummy.id,
    date_completed: latestDateInStatsStreak.minus({ days: 2 }).toJSDate(),
    morning_routine_completion_percentage: 60,
    evening_routine_completion_percentage: 70,
    focus_modes_completed: 3,
    should_recalculate: false,
    morning_sequence_log_id: null,
    evening_sequence_log_id: randomUUID(),
  },
  {
    id: randomUUID(),
    user_id: userDummy.id,
    date_completed: latestDateInStatsStreak.minus({ days: 3 }).toJSDate(),
    morning_routine_completion_percentage: 5,
    evening_routine_completion_percentage: 5,
    focus_modes_completed: 4,
    should_recalculate: false,
    morning_sequence_log_id: null,
    evening_sequence_log_id: randomUUID(),
  },
  {
    id: randomUUID(),
    user_id: userDummy.id,
    date_completed: latestDateInStatsStreak.minus({ days: 4 }).toJSDate(),
    morning_routine_completion_percentage: 60,
    evening_routine_completion_percentage: 70,
    focus_modes_completed: 3,
    should_recalculate: false,
    morning_sequence_log_id: null,
    evening_sequence_log_id: randomUUID(),
  },
  {
    id: randomUUID(),
    user_id: userDummy.id,
    date_completed: latestDateInStatsStreak.minus({ days: 5 }).toJSDate(),
    morning_routine_completion_percentage: 60,
    evening_routine_completion_percentage: 70,
    focus_modes_completed: 7,
    should_recalculate: false,
    morning_sequence_log_id: null,
    evening_sequence_log_id: randomUUID(),
  },
  {
    id: randomUUID(),
    user_id: userDummy.id,
    date_completed: latestDateInStatsStreak.minus({ days: 6 }).toJSDate(),
    morning_routine_completion_percentage: 60,
    evening_routine_completion_percentage: 70,
    focus_modes_completed: 4,
    should_recalculate: false,
    morning_sequence_log_id: null,
    evening_sequence_log_id: randomUUID(),
  },
  {
    id: randomUUID(),
    user_id: userDummy.id,
    date_completed: latestDateInStatsStreak.minus({ days: 7 }).toJSDate(),
    morning_routine_completion_percentage: 60,
    evening_routine_completion_percentage: 70,
    focus_modes_completed: 3,
    should_recalculate: false,
    morning_sequence_log_id: null,
    evening_sequence_log_id: randomUUID(),
  },
  {
    id: randomUUID(),
    user_id: userDummy.id,
    date_completed: latestDateInStatsStreak.minus({ days: 8 }).toJSDate(),
    morning_routine_completion_percentage: 60,
    evening_routine_completion_percentage: 70,
    focus_modes_completed: 7,
    should_recalculate: false,
    morning_sequence_log_id: null,
    evening_sequence_log_id: randomUUID(),
  },
  {
    id: randomUUID(),
    user_id: userDummy.id,
    date_completed: latestDateInStatsStreak.minus({ days: 9 }).toJSDate(),
    morning_routine_completion_percentage: 60,
    evening_routine_completion_percentage: 70,
    focus_modes_completed: 4,
    should_recalculate: false,
    morning_sequence_log_id: null,
    evening_sequence_log_id: randomUUID(),
  },
  {
    id: randomUUID(),
    user_id: userDummy.id,
    date_completed: latestDateInStatsStreak.minus({ days: 10 }).toJSDate(),
    morning_routine_completion_percentage: 60,
    evening_routine_completion_percentage: 70,
    focus_modes_completed: 3,
    should_recalculate: false,
    morning_sequence_log_id: null,
    evening_sequence_log_id: randomUUID(),
  },
];

export const dailyStatsArrayDummyWithSkippedDay = [
  {
    id: randomUUID(),
    user_id: userDummy.id,
    date_completed: latestDateInStatsStreak.toJSDate(),
    morning_routine_completion_percentage: 60,
    evening_routine_completion_percentage: 70,
    focus_modes_completed: 7,
    should_recalculate: false,
    morning_sequence_log_id: null,
    evening_sequence_log_id: randomUUID(),
  },
  {
    id: randomUUID(),
    user_id: userDummy.id,
    date_completed: latestDateInStatsStreak.minus({ days: 2 }).toJSDate(),
    morning_routine_completion_percentage: 60,
    evening_routine_completion_percentage: 70,
    focus_modes_completed: 3,
    should_recalculate: false,
    morning_sequence_log_id: null,
    evening_sequence_log_id: randomUUID(),
  },
];

export const QueueMock = {
  add: jest.fn(),
  process: jest.fn(),
};

export const routineDurationsDummy = {
  MON: 300,
  TUE: 300,
  WED: 300,
  THU: 300,
  FRI: 300,
  SAT: 300,
  SUN: 300,
};

export const logQuantityQuestionsDummy = [
  {
    id: randomUUID(),
    question: 'Test Question 1',
    min_value: 0,
    max_value: 10,
    min_value_description: 'Test min description',
    max_value_description: 'Test max description',
    activity_id: '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
    user_id: userDummy.id,
  },
  {
    id: randomUUID(),
    question: 'Test Question 2',
    min_value: 0,
    max_value: 10,
    min_value_description: 'Test min description',
    max_value_description: 'Test max description',
    activity_id: 'a2550a6e-a413-4763-87f8-207b86fcd4cf',
    user_id: userDummy.id,
  },
];

export const DailyStatsDummy = [
  {
    date_completed: DateTime.local().minus({ days: 1 }).toJSDate(),
    focus_modes_completed: 3,
    morning_routine_completion_percentage: 50,
    evening_routine_completion_percentage: 60,
  },
  {
    date_completed: DateTime.local().minus({ days: 2 }).toJSDate(),
    focus_modes_completed: 3,
    morning_routine_completion_percentage: 34,
    evening_routine_completion_percentage: 78,
  },
  {
    date_completed: DateTime.local().minus({ days: 3 }).toJSDate(),
    focus_modes_completed: 3,
    morning_routine_completion_percentage: 47,
    evening_routine_completion_percentage: 98,
  },
];

export const DailyDurationsDummy = { MON: 300, TUE: 500, WED: 350, THU: 600, FRI: 300, SAT: 400, SUN: 1000 };

export const fastifyRequestDummy: FastifyRequest = {
  body: {},
  headers: {},
} as FastifyRequest;
