import { randomUUID } from 'crypto';
import { ActivityChoiceType } from '../../src/modules/activity/domain/activity-choice-type.enum';
import { SerializedActivity } from '../../src/modules/activity/services/activity-parser/activity-parser.service';
import { Passport } from '../../src/modules/auth/domain/passport.model';
import { User } from '../../src/modules/user/entities/user.entity';

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
    startup_time: '06:15',
    break_after_minutes: 15,
    shutdown_time: '20:30',
    email: 'some@gmail.com',
    auth0_id: '123dfewvwbt4de3e',
  },
  { generateId: true },
);

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
          video_urls: ['https://www.youtube.com/watch?v=xcrc5wTZwNk'],
          log_quantity_question: 'choice djdjdjd',
          name: 'Choice',
          log_quantity: true,
        },
        {
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
