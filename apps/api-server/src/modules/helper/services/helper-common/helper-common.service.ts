import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { DaysOfWeek } from '../../../activity/domain/days-of-week.enum';

@Injectable()
export class HelperCommonService {
  deepFreezeObject<T>(object: any): Readonly<T> {
    const keys: string[] = Object.keys(object);
    const isObject = (key) => Boolean(typeof object[key] === 'object');
    const isMutable = (key) => Boolean(!Object.isFrozen(object[key]));
    const isMutableObject = (key) => Boolean(isObject(key) && isMutable(key));
    const iterator = (key) => (isMutableObject(key) ? this.deepFreezeObject(object[key]) : null);
    keys.forEach(iterator);
    return Object.freeze(object);
  }

  getDayOfWeek(timeZone = 'UTC'): DaysOfWeek {
    const daysOfWeekMap = {
      1: DaysOfWeek.MON,
      2: DaysOfWeek.TUE,
      3: DaysOfWeek.WED,
      4: DaysOfWeek.THU,
      5: DaysOfWeek.FRI,
      6: DaysOfWeek.SAT,
      7: DaysOfWeek.SUN,
    };
    const currentDay = DateTime.local({ zone: timeZone }).weekday;
    return daysOfWeekMap[currentDay];
  }
}
