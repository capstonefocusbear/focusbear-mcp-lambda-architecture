import { UpdateActivityDto } from '@api-server/modules/activity/dto/update-activity.dto';

export * from './openai-module-options.interface';

export interface AdjustedHabit {
  id: string;
  name: string;
  duration_seconds: number;
  tags?: string[];
}
export type AdjustedHabitsGrouped = Record<string, Partial<UpdateActivityDto>[]>;
