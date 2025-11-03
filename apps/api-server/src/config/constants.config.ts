import { registerAs } from '@nestjs/config';
import { UpdateUserSettingsDto } from '../modules/user/dto/update-user-settings.dto';

export const constants = registerAs('constants', () => ({
  validation: {
    patterns: {
      'HH:MM': /^([01][0-9]|2[0-3]):([0-5][0-9])$/,
    },
  },
  subscriptions: {
    trialDurationDays: '7',
  },
  userSettings: {
    generateDefault: (): UpdateUserSettingsDto => ({
      shutdown_time: '20:30',
      startup_time: '05:15',
      morning_activities: [],
      break_after_minutes: 15,
      break_activities: [],
      evening_activities: [],
      custom_routines: [],
    }),
  },
}));
