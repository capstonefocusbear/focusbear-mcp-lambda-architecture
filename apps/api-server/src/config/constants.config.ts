import { registerAs } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { ActivityChoiceType } from '../modules/activity/domain/activity-choice-type.enum';
import { UpdateUserSettingsDto } from '../modules/user/dto/update-user-settings.dto';

export const constants = registerAs('constants', () => ({
  validation: {
    patterns: {
      'HH:MM': /^([01][0-9]|2[0-3]):([0-5][0-9])$/,
    },
  },
  subscriptions: {
    trialDurationDays: '3',
  },
  userSettings: {
    generateDefault: (): UpdateUserSettingsDto => ({
      shutdown_time: '20:30',
      startup_time: '05:15',
      morning_activities: [
        {
          id: randomUUID(),
          name: 'Yoga',
          duration_seconds: 300,
          log_quantity: false,
          video_urls: [],
        },
        {
          id: randomUUID(),
          name: 'Journalling',
          video_urls: [],
          duration_seconds: 300,
        },
        {
          id: randomUUID(),
          name: 'Deep breathing',
          duration_seconds: 180,
          log_quantity: false,
          video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
        },
      ],
      break_after_minutes: 15,
      break_activities: [
        {
          id: randomUUID(),
          name: 'Micro-workout',
          duration_seconds: 60,
          include_in_every_break: true,
          video_urls: [],
          choice_type: ActivityChoiceType.random,
          choices: [
            {
              id: randomUUID(),
              name: 'Pushups',
              video_urls: [],
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
              video_urls: [],
              log_quantity: false,
            },
          ],
        },
        {
          id: randomUUID(),
          name: 'Deep breathing',
          duration_seconds: 20,
          include_in_every_break: true,
          video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
        },
        {
          id: randomUUID(),
          name: "Dance like no-one's watching",
          duration_seconds: 40,
          video_urls: [],
          log_quantity: false,
        },
      ],
      evening_activities: [
        {
          id: randomUUID(),
          name: 'Tidy up desk',
          duration_seconds: 180,
          video_urls: [],
          log_quantity: false,
        },
        {
          id: randomUUID(),
          name: 'Journal about day',
          duration_seconds: 300,
          video_urls: [],
          log_quantity: false,
        },
        {
          id: randomUUID(),
          name: 'Plan to-do list and schedule for tomorrow',
          duration_seconds: 420,
          video_urls: [],
        },
      ],
    }),
  },
}));
