import { randomUUID } from 'crypto';
import { User as Auth0User } from 'auth0';
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

export const authtorizedPassportDummy = new Passport({
  isAuth: true,
  user: { id: randomUUID() },
});

export const unthtorizedPassportDummy = new Passport({
  isAuth: false,
  declineReason: 'The Token expired!',
});

export const userDummy = new User(
  {
    id: '3a4f0bb1-5313-49da-9ae6-cc28e864763f',
    startup_time: '06:15',
    break_after_minutes: 15,
    shutdown_time: '20:30',
    email: 'some@gmail.com',
    auth0_id: '123dfewvwbt4de3e',
    user_type: UserTypes.STANDARD,
  },
  { generateId: false },
);

export const adminUserDummy = new User(
  {
    id: '7b4f0bb4-7521-85da-1ae2-cc28e864763e',
    startup_time: '06:15',
    break_after_minutes: 15,
    shutdown_time: '20:30',
    email: 'some@gmail.com',
    auth0_id: '123dfewvwbt4de3e',
    user_type: UserTypes.ADMIN,
  },
  { generateId: false },
);

export const auth0UserDummy: Auth0User = {
  _id: '1',
  email: 'some@email',
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
    },
    {
      id: 'f01818e3-9e19-4b55-a2ae-15bbf2db2ec1',
      name: 'Journalling',
      video_urls: [],
      duration_seconds: 300,
    },
    {
      id: '3b57f802-23b0-47e2-a188-b07001db8e1f',
      duration_seconds: 180,
      video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
      name: 'Deep breathing',
      log_quantity: false,
    },
  ],
  evening_activities: [
    {
      id: '4b57f802-23b0-47e2-a188-b07001db8e1f',
      duration_seconds: 180,
      video_urls: [],
      name: 'Tidy up desk',
      log_quantity: false,
    },
    {
      id: '0b57f802-23b0-47e2-a188-b07001db8e1f',
      duration_seconds: 300,
      video_urls: [],
      name: 'Journal about day',
      log_quantity: false,
    },
    {
      id: '1b57f802-23b0-47e2-a188-b07001db8e1f',
      name: 'Plan to-do list and schedule for tomorrow',
      duration_seconds: 420,
      video_urls: [],
    },
  ],
  break_activities: [
    {
      id: '8b57f802-23b0-47e2-a188-b07001db8e1f',
      log_quantity_question: '',
      duration_seconds: 60,
      allowed_urls: [],
      include_in_every_break: false,
      choices: [
        {
          id: randomUUID(),
          name: 'Pushups',
          video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
          log_quantity: true,
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
    },
    {
      id: '6b57f802-23b0-47e2-a188-b07001db8e1f',
      duration_seconds: 40,
      video_urls: [],
      name: "Dance like no-one's watching",
      log_quantity: false,
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
      log_quantity_question: 'Log quantity data?',
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
  },
  { generateId: true },
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

export const CompletedActivitiesForSequenceDummy = (sequence: ActivitySequence): CompletedActivity[] => {
  const duration_logged = 600;
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

export const ActivityDummy: Activity = new Activity(
  {
    user_id: userDummy.id,
    type: ActivityType.evening,
    log_summary_type: LogSummaryType.SUM,
    log_quantity: true,
    duration_seconds: 600,
    activity_data: new ActivityData(),
    activity_sequence_id: ActivitySequenceDummy.id,
  },
  { generateId: true },
);

export const CompletedActivityDummy = new CompletedActivity(
  {
    activity_id: ActivityDummy.id,
    activity: ActivityDummy,
    activity_sequence_id: ActivityDummy.activity_sequence_id,
    quantity_logged: 50,
    duration_logged: 13,
    start_time: new Date(Date.now() - 50 * 1000),
    finish_time: new Date(),
  },
  {
    generateId: true,
    log_quantity: true,
  },
);

export const FocusModeDummy = new FocusMode(
  {
    user_id: userDummy.id,
    name: 'Some string value',
    allowed_apps: [],
    allowed_urls: [],
  },
  { generateId: true },
);

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
  },
  { generateId: true },
);

export const UncompletedSequenceLogDummy = new CompletedActivitySequence({
  activity_sequence_id: ActivitySequenceDummy.id,
  user_id: userDummy.id,
  start_time: new Date(),
  is_completed: false,
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
  startup_time: '05:45',
  shutdown_time: '20:45',
  break_after_minutes: 20,
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

export const sendinblueEventDummy = {
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
