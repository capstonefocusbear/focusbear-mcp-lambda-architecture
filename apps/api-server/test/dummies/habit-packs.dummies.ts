import { ActivityChoiceType } from '../../src/modules/activity/domain/activity-choice-type.enum';
import { ActivityType } from '../../src/modules/activity/domain/activity-type.enum';
import { LogSummaryType } from '../../src/modules/activity/domain/log-summary-type.enum';
import { HabitPackType } from '../../src/modules/habit-pack/domain/habit-pack-type.enum';
import { MarketplaceRequestType } from '../../src/modules/habit-pack/domain/marketplace-request.enum';
import { InstalledPack } from '../../src/modules/habit-pack/entity/installed-pack.entity';
import { userDummy } from '.';

export const standaloneHabitPackDummy = {
  pack_type: HabitPackType.standalone,
  id: '8f458a6b-72ad-471b-80cc-22f47fd7c2b4',
  pack_name: 'Second Standalone Pack',
  description: 'Sweeter pack!',
  description_video_url: 'www.google.com',
  welcome_message: "Welcome to Focus Bear ya'll",
  welcome_video_url: 'www.youtube.com',
  marketplace_approval_status: true,
  marketplace_request: MarketplaceRequestType.requested,
  standalone_activities: [
    {
      id: 'b9501b80-1286-464a-b0be-5838f52e2ff8',
      name: 'Journaling',
      video_urls: [],
      choice_type: ActivityChoiceType.random,
      activity_type: 'standalone_activity',
      duration_seconds: 300,
      pack_id: '8f458a6b-72ad-471b-80cc-22f47fd7c2b4',
      log_quantity: false,
      log_summary_type: LogSummaryType.SUM,
      choices: [
        {
          id: '3a9061fa-1cc1-43e9-a0ca-6cbfe6a4da80',
          name: 'Crunches',
          video_urls: ['https://www.youtube.com/watch?v=ueSWOFxOZSc'],
          activity_type: 'standalone_activity',
          duration_seconds: 300,
          log_quantity: true,
          log_summary_type: LogSummaryType.SUM,
        },
      ],
    },
    {
      id: 'b9501b60-1286-484a-b0be-5838f52e2ff9',
      name: 'Swimming',
      video_urls: [],
      activity_type: 'standalone_activity',
      duration_seconds: 300,
      pack_id: '8f458a6b-72ad-471b-80cc-22f47fd7c2b4',
      log_quantity: false,
      log_summary_type: LogSummaryType.SUM,
      choices: [],
    },
  ],
};

export const routineHabitPackDummy = {
  pack_type: HabitPackType.routine,
  id: '34dd7441-16f9-4772-be6c-416f9af5689b',
  pack_name: 'Best routine pack',
  description: 'Test 12/10/22 12:27.',
  description_video_url: 'www.google.com',
  welcome_message: 'Welcome to Focus Bear!',
  welcome_video_url: 'www.youtube.com',
  marketplace_approval_status: false,
  marketplace_request: MarketplaceRequestType.requested,
  morning_activities: [
    {
      id: 'b24c9383-f8a0-409c-bbd9-e37b9566de3b',
      name: 'Yoga',
      video_urls: ['https://www.youtube.com/watch?v=nz5MCv0sFDA', 'https://www.youtube.com/watch?v=oexYiIy75V8'],
      activity_type: 'morning_activity',
      duration_seconds: 300,
      pack_id: '34dd7441-16f9-4772-be6c-416f9af5689b',
      log_quantity: false,
      log_summary_type: LogSummaryType.SUM,
      choices: [],
    },
  ],
  break_activities: [
    {
      id: '630c921d-dc9c-4107-acd2-023d7930d9bf',
      name: 'Micro-workout',
      is_office_friendly: false,
      video_urls: [],
      allowed_apps: [],
      include_in_every_break: true,
      log_quantity_question: '',
      choice_type: ActivityChoiceType.random,
      allowed_urls: [],
      activity_type: 'break_activity',
      duration_seconds: 30,
      pack_id: '34dd7441-16f9-4772-be6c-416f9af5689b',
      log_quantity: false,
      log_summary_type: LogSummaryType.SUM,
      choices: [],
    },
  ],
  evening_activities: [
    {
      id: 'f3dbeeb2-9284-4d39-bbd4-04cc17d40b4e',
      name: 'Mess up desk',
      video_urls: [],
      activity_type: 'evening_activity',
      duration_seconds: 150,
      pack_id: '34dd7441-16f9-4772-be6c-416f9af5689b',
      log_quantity: false,
      log_summary_type: LogSummaryType.SUM,
      choices: [],
    },
  ],
};

export const standaloneHabitPackDBResponseDummy = {
  id: 'bc55568b-59bb-4842-8a83-e92843356978',
  user_id: '3a4f0bb1-5313-49da-9ae6-cc28e864763f',
  pack_name: "Standalone Pack's Name",
  pack_type: HabitPackType.standalone,
  description: 'This is a great pack',
  description_video_url: 'www.youtube.com',
  welcome_message: 'Welcome to Focus Bear',
  welcome_video_url: 'www.youtube.com',
  marketplace_approval_status: true,
  marketplace_request: MarketplaceRequestType.unrequested,
  activity_templates: [
    {
      id: '116af843-818a-4e09-aaa2-53da041896de',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      activity_type: 'standalone',
      name: 'Yoga',
      duration_seconds: 300,
      log_quantity: false,
      video_urls: ['https://www.youtube.com/watch?v=nz5MCv0sFDA', 'https://www.youtube.com/watch?v=oexYiIy75V8'],
    },
    {
      id: 'b8301b80-1286-464a-b0be-5838f52e2ff6',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      activity_type: 'standalone',
      name: 'Journaling',
      video_urls: [],
      duration_seconds: 300,
    },
    {
      id: '74935284-e936-4247-8afa-e453484865e0',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      activity_type: 'standalone',
      name: 'Deep breathing',
      duration_seconds: 180,
      log_quantity: false,
      video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
    },
  ],
};

export const routineHabitPackDBResponseDummy = {
  id: 'bc55568b-59bb-4842-8a83-e92843356978',
  user_id: userDummy.id,
  pack_name: 'Nice routine pack',
  pack_type: HabitPackType.routine,
  description: 'Description of activities',
  description_video_url: 'www.youtube.com',
  welcome_message: 'Welcome to Focus Bear',
  welcome_video_url: 'www.youtube.com',
  marketplace_request: MarketplaceRequestType.unrequested,
  activity_templates: [
    {
      id: '116af843-818a-4e09-aaa2-53da041896de',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      activity_type: 'morning',
      name: 'Yoga',
      duration_seconds: 300,
      log_quantity: false,
      video_urls: ['https://www.youtube.com/watch?v=nz5MCv0sFDA', 'https://www.youtube.com/watch?v=oexYiIy75V8'],
    },
    {
      id: 'b8301b80-1286-464a-b0be-5838f52e2ff6',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      activity_type: 'morning',
      name: 'Journaling',
      video_urls: [],
      duration_seconds: 300,
    },
    {
      id: '74935284-e936-4247-8afa-e453484865e0',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      activity_type: 'break',
      name: 'Deep breathing',
      duration_seconds: 180,
      log_quantity: false,
      video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
    },
    {
      id: '94935284-e936-4247-8afa-e453484865e4',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      activity_type: 'evening',
      name: 'Deep breathing',
      duration_seconds: 180,
      log_quantity: false,
      video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
    },
  ],
};

export const marketplaceApprovedPacksDummy = [standaloneHabitPackDBResponseDummy, routineHabitPackDBResponseDummy];

export const serializedStandaloneActivityDummy = {
  standalone_activities: [
    {
      id: '116af843-818a-4e09-aaa2-53da041896de',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      name: 'Yoga',
      duration_seconds: 300,
      log_quantity: false,
      video_urls: ['https://www.youtube.com/watch?v=nz5MCv0sFDA', 'https://www.youtube.com/watch?v=oexYiIy75V8'],
    },
    {
      id: 'b8301b80-1286-464a-b0be-5838f52e2ff6',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      name: 'Journaling',
      video_urls: [],
      duration_seconds: 300,
    },
    {
      id: '74935284-e936-4247-8afa-e453484865e0',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      name: 'Deep breathing',
      duration_seconds: 180,
      log_quantity: false,
      video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
    },
  ],
};

export const serializedRoutineActivityDummy = {
  morning_activities: [
    {
      id: '116af843-818a-4e09-aaa2-53da041896de',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      name: 'Yoga',
      duration_seconds: 300,
      log_quantity: false,
      video_urls: ['https://www.youtube.com/watch?v=nz5MCv0sFDA', 'https://www.youtube.com/watch?v=oexYiIy75V8'],
    },
    {
      id: '74935284-e936-4247-8afa-e453484865e0',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      name: 'Deep breathing',
      duration_seconds: 180,
      log_quantity: false,
      video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
    },
  ],
  break_activities: [
    {
      id: '346af843-818a-4e09-aaa2-53da041896de',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      name: 'Yoga',
      duration_seconds: 300,
      log_quantity: false,
      video_urls: ['https://www.youtube.com/watch?v=nz5MCv0sFDA', 'https://www.youtube.com/watch?v=oexYiIy75V8'],
    },
    {
      id: '87935284-e936-4247-8afa-e453484865e0',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      name: 'Deep breathing',
      duration_seconds: 180,
      log_quantity: false,
      video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
    },
  ],
  evening_activities: [
    {
      id: '906af843-818a-4e09-aaa2-53da041896de',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      name: 'Yoga',
      duration_seconds: 300,
      log_quantity: false,
      video_urls: ['https://www.youtube.com/watch?v=nz5MCv0sFDA', 'https://www.youtube.com/watch?v=oexYiIy75V8'],
    },
    {
      id: '67935284-e936-4247-8afa-e453484865e0',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      name: 'Deep breathing',
      duration_seconds: 300,
      log_quantity: false,
      video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
    },
  ],
};

export const createActivityTemplateActivityDataDummy = {
  id: 'b9501b80-1286-464a-b0be-5838f52e2ff8',
  duration_seconds: 300,
  log_quantity: false,
  log_summary_type: LogSummaryType.SUM,
  choices: [
    {
      id: '3a9061fa-1cc1-43e9-a0ca-6cbfe6a4da80',
      name: 'Crunches',
      video_urls: [],
      activity_type: 'standalone_activity',
      duration_seconds: 300,
      log_quantity: true,
      log_summary_type: LogSummaryType.SUM,
    },
  ],
  name: 'Journaling',
  video_urls: [],
  choice_type: ActivityChoiceType.random,
  activity_type: 'standalone_activity',
  pack_id: '8f458a6b-72ad-471b-80cc-22f47fd7c2b4',
};

export const createActivityTemplateContextDummy = {
  activity_type: ActivityType.standalone,
  user_id: userDummy.id,
  pack_id: '8f458a6b-72ad-471b-80cc-22f47fd7c2b4',
};

export const activityTemplateArrayDummy = [
  {
    id: 'b9501b80-1286-464a-b0be-5838f52e2ff8',
    pack_id: '8f458a6b-72ad-471b-80cc-22f47fd7c2b4',
    activity_type: ActivityType.standalone,
    log_summary_type: LogSummaryType.SUM,
    log_quantity: false,
    activity_data: { name: 'Journaling', video_urls: [], choice_type: ActivityChoiceType.random },
    duration_seconds: 300,
    parent_id: null,
    choices: [
      {
        id: '3a9061fa-1cc1-43e9-a0ca-6cbfe6a4da80',
        pack_id: '8f458a6b-72ad-471b-80cc-22f47fd7c2b4',
        activity_type: ActivityType.standalone,
        log_summary_type: LogSummaryType.SUM,
        log_quantity: true,
        activity_data: { name: 'Crunches', video_urls: [] },
        duration_seconds: 300,
        parent_id: 'b9501b80-1286-464a-b0be-5838f52e2ff8',
        choices: [],
      },
    ],
  },
  {
    id: 'b9501b60-1286-484a-b0be-5838f52e2ff9',
    pack_id: '8f458a6b-72ad-471b-80cc-22f47fd7c2b4',
    activity_type: ActivityType.standalone,
    log_summary_type: LogSummaryType.SUM,
    log_quantity: false,
    activity_data: { name: 'Swimming', video_urls: [], choice_type: ActivityChoiceType.random },
    duration_seconds: 300,
    parent_id: null,
    choices: [],
  },
  {
    id: '3a9061fa-1cc1-43e9-a0ca-6cbfe6a4da80',
    pack_id: '8f458a6b-72ad-471b-80cc-22f47fd7c2b4',
    activity_type: ActivityType.standalone,
    log_summary_type: LogSummaryType.SUM,
    log_quantity: true,
    activity_data: { name: 'Crunches', video_urls: [] },
    duration_seconds: 300,
    parent_id: 'b9501b80-1286-464a-b0be-5838f52e2ff8',
    choices: [],
  },
];

export const activityTemplateFromDBDummy = {
  id: '3a9061fa-1cc1-43e9-a0ca-6cbfe6a4da80',
  pack_id: '8f458a6b-72ad-471b-80cc-22f47fd7c2b4',
  activity_type: ActivityType.standalone,
  log_summary_type: LogSummaryType.SUM,
  log_quantity: true,
  activity_data: { name: 'Crunches', video_urls: [] },
  duration_seconds: 300,
  parent_id: 'b9501b80-1286-464a-b0be-5838f52e2ff8',
  choices: [],
};

export const deserializedStandaloneActivitiesDummy = [
  [
    {
      id: '116af843-818a-4e09-aaa2-53da041896de',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      activity_data: { name: 'Crunches', video_urls: [] },
      activity_type: ActivityType.standalone,
      user_id: '3f6b5a5a-a45d-4806-b4ae-2bfac3e38f14',
      duration_seconds: 300,
      log_quantity: false,
      log_summary_type: undefined,
      has_choices: false,
    },
    {
      id: 'b8301b80-1286-464a-b0be-5838f52e2ff6',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      activity_data: { name: 'Situps', video_urls: [] },
      activity_type: ActivityType.standalone,
      user_id: '3f6b5a5a-a45d-4806-b4ae-2bfac3e38f14',
      duration_seconds: 300,
      log_quantity: undefined,
      log_summary_type: undefined,
      has_choices: false,
    },
    {
      id: '74935284-e936-4247-8afa-e453484865e0',
      pack_id: 'bc55568b-59bb-4842-8a83-e92843356978',
      activity_data: { name: 'Pullups', video_urls: [] },
      activity_type: ActivityType.standalone,
      user_id: '3f6b5a5a-a45d-4806-b4ae-2bfac3e38f14',
      duration_seconds: 180,
      log_quantity: false,
      log_summary_type: undefined,
      has_choices: false,
    },
  ],
];

export const deserializedRoutineActivitiesDummy = [
  [
    {
      id: 'b24c9383-f8a0-409c-bbd9-e37b9566de3b',
      pack_id: '34dd7441-16f9-4772-be6c-416f9af5689b',
      activity_data: { name: 'Write to-dos for day', video_urls: [] },
      activity_type: ActivityType.morning,
      user_id: '3f6b5a5a-a45d-4806-b4ae-2bfac3e38f14',
      duration_seconds: 300,
      log_quantity: false,
      log_summary_type: 'SUM',
      has_choices: false,
    },
  ],
  [
    {
      id: '630c921d-dc9c-4107-acd2-023d7930d9bf',
      pack_id: '34dd7441-16f9-4772-be6c-416f9af5689b',
      activity_data: { name: 'Take a stretch', video_urls: [] },
      activity_type: ActivityType.break,
      user_id: '3f6b5a5a-a45d-4806-b4ae-2bfac3e38f14',
      duration_seconds: 30,
      log_quantity: false,
      log_summary_type: 'SUM',
      has_choices: false,
    },
  ],
  [
    {
      id: 'f3dbeeb2-9284-4d39-bbd4-04cc17d40b4e',
      pack_id: '34dd7441-16f9-4772-be6c-416f9af5689b',
      activity_data: { name: 'Journal about day', video_urls: [] },
      activity_type: ActivityType.evening,
      user_id: '3f6b5a5a-a45d-4806-b4ae-2bfac3e38f14',
      duration_seconds: 150,
      log_quantity: false,
      log_summary_type: 'SUM',
      has_choices: false,
    },
  ],
];

export const deserializedActivitiesDummy = [
  {
    sequence: {
      id: 'dbce759c-00e4-429f-8d5a-0a10c76777f3',
      type: 'standalone',
      activity_ids: [Array],
      user_id: '3f6b5a5a-a45d-4806-b4ae-2bfac3e38f14',
      total_duration_seconds: 780,
    },
    activities: [
      {
        id: 'c4dbeeb1-7284-4d39-eed4-04cc17d40b7b',
        pack_id: '34dd7441-16f9-4772-be6c-416f9af5689b',
        activity_data: { name: 'Journal about day', video_urls: [] },
        activity_type: ActivityType.evening,
        user_id: '3f6b5a5a-a45d-4806-b4ae-2bfac3e38f14',
        duration_seconds: 150,
        log_quantity: false,
        log_summary_type: 'SUM',
        has_choices: false,
      },
      {
        id: 'f3dbeeb2-9284-4d39-bbd4-04cc17d40b4e',
        pack_id: '34dd7441-16f9-4772-be6c-416f9af5689b',
        activity_data: { name: 'Journal about day', video_urls: [] },
        activity_type: ActivityType.evening,
        user_id: '3f6b5a5a-a45d-4806-b4ae-2bfac3e38f14',
        duration_seconds: 150,
        log_quantity: false,
        log_summary_type: 'SUM',
        has_choices: false,
      },
    ],
  },
];

export const userSettingsDummy = {
  shutdown_time: '20:45',
  startup_time: '05:45',
  morning_activities: [
    {
      id: 'a4758757-5894-46c6-9f33-a081a351a2f6',
      name: 'Deep breathing',
      duration_seconds: 180,
      log_quantity: false,
      video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
    },
  ],
  break_after_minutes: 20,
  break_activities: [
    {
      id: '666da3c5-50b7-4205-a481-13b402de53d6',
      name: 'Micro-workout',
      duration_seconds: 30,
      include_in_every_break: true,
      video_urls: [],
      choice_type: ActivityChoiceType.random,
      choices: [
        {
          id: '310b74aa-d6c2-4153-93f1-dab6cd1db49a',
          name: 'Pushups',
          video_urls: ['https://www.youtube.com/watch?v=StXac04arIc', 'https://www.youtube.com/watch?v=dOY-VkXbJCY'],
          log_quantity: true,
        },
        {
          id: 'f5b81679-9f4b-46e9-9013-7cfb3a9e90b3',
          name: 'Abs',
          video_urls: ['https://www.youtube.com/watch?v=cymGONhOFuQ', 'https://www.youtube.com/watch?v=f97P6JDr1c8'],
          log_quantity: true,
          log_quantity_question: '',
        },
      ],
      log_quantity: false,
      log_summary_type: '',
      log_quantity_question: '',
      allowed_apps: [],
      allowed_urls: [],
      is_office_friendly: false,
    },
  ],
  evening_activities: [
    {
      id: '83560cd9-56c7-4dc0-b01d-e1d6986bd6e3',
      name: 'Tidy up desk',
      duration_seconds: 180,
      video_urls: [],
      log_quantity: false,
    },
  ],
};

export const activityTemplateIdsDummy = [
  'b4cec92c-b0c3-45fa-9d76-2666b7c929d0',
  'a2de8c6b-cd51-4840-af3f-d2c0b0a4e353',
  '379bbed0-ef7c-4ddb-b396-69d5f2861306',
];

export const installedPackRecordDummy: InstalledPack = {
  id: 'uuid-1',
  pack_id: 'uuid-2',
  user_id: 'uuid-3',
  installation_status: true,
  activity_sequence_id: '934bbed0-a3ec-4bdb-b396-89d5f2862845',
};

export const uninstalledPackRecordDummy: InstalledPack = {
  id: 'uuid-1',
  pack_id: 'uuid-2',
  user_id: 'uuid-3',
  installation_status: false,
};
