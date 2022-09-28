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
          video_urls: ['https://www.youtube.com/watch?v=nz5MCv0sFDA', 'https://www.youtube.com/watch?v=oexYiIy75V8'],
        },
        {
          id: randomUUID(),
          name: 'Journaling',
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
          duration_seconds: 30,
          include_in_every_break: true,
          video_urls: [],
          choice_type: ActivityChoiceType.random,
          is_office_friendly: false,
          choices: [
            {
              id: randomUUID(),
              name: 'Pushups',
              video_urls: [
                'https://www.youtube.com/watch?v=StXac04arIc',
                'https://www.youtube.com/watch?v=dOY-VkXbJCY',
              ],
              log_quantity: true,
            },
            {
              id: randomUUID(),
              name: 'Situps',
              video_urls: ['https://www.youtube.com/watch?v=ueSWOFxOZSc'],
              log_quantity: true,
            },
            {
              id: randomUUID(),
              name: 'Squats',
              video_urls: [
                'https://www.youtube.com/watch?v=EL1wNBsEHiY',
                'https://www.youtube.com/watch?v=R0Ut6nldt9g',
                'https://www.youtube.com/watch?v=VciI0zL6TAo',
              ],
              log_quantity: true,
            },
            {
              id: randomUUID(),
              name: 'Lunges',
              video_urls: [
                'https://www.youtube.com/watch?v=AZWPE5D1hHQ',
                'https://www.youtube.com/watch?v=9StkRofe0HE',
                'https://www.youtube.com/watch?v=aLgQiruL6nQ',
              ],
              log_quantity: true,
            },
            {
              id: randomUUID(),
              name: 'Stretching',
              video_urls: ['https://www.youtube.com/watch?v=s5V_sVvagrM'],
              log_quantity: true,
            },
            {
              id: randomUUID(),
              name: 'Move Your Body',
              video_urls: [
                'https://www.youtube.com/watch?v=2LVjYfxwz4c',
                'https://www.youtube.com/watch?v=GapAX8tOe2s',
              ],
              log_quantity: true,
              log_quantity_question: '',
            },
            {
              id: randomUUID(),
              name: 'Abs',
              video_urls: [
                'https://www.youtube.com/watch?v=cymGONhOFuQ',
                'https://www.youtube.com/watch?v=f97P6JDr1c8',
              ],
              log_quantity: true,
              log_quantity_question: '',
            },
            {
              id: randomUUID(),
              name: 'Dips',
              video_urls: ['https://www.youtube.com/watch?v=C9r55uFuQhU'],
              log_quantity: true,
              log_quantity_question: '',
            },
          ],
        },
        {
          id: randomUUID(),
          name: 'Deep breathing',
          duration_seconds: 30,
          is_office_friendly: true,
          include_in_every_break: true,
          video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
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
