import { DateTime } from 'luxon';

export class UserTimesResponse {
  userTimeZone: string;

  userCurrentTime: DateTime;

  userStartupTime: DateTime;

  userShutdownTime: DateTime;
}
