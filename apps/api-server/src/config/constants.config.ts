import { registerAs } from '@nestjs/config';

export const constants = registerAs('constants', () => ({
  validation: {
    patterns: {
      'HH:MM': new RegExp(/^([01][0-9]|2[0-3]):([0-5][0-9])$/),
    },
  },
}));
