import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SequenceStatus } from './sequence-status.enum';

export class RoutineProgressItem {
  @ApiProperty()
  sequence_id: string;

  @ApiProperty({ enum: SequenceStatus, enumName: 'SequenceStatus' })
  status: SequenceStatus;

  @ApiPropertyOptional({
    type: [String],
    description: 'All logged activity IDs for this routine, including skipped activities.',
  })
  completed_habit_ids?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Subset of completed_habit_ids that were skipped without completion. skipped_did_complete is excluded.',
  })
  skipped_habit_ids?: string[];
}

export class TodayRoutineProgress {
  @ApiProperty({ type: RoutineProgressItem, nullable: true })
  morning_routine: RoutineProgressItem | null;

  @ApiProperty({ type: RoutineProgressItem, nullable: true })
  evening_routine: RoutineProgressItem | null;

  @ApiProperty({ type: [RoutineProgressItem] })
  custom_routines: RoutineProgressItem[];

  @ApiProperty({ type: [RoutineProgressItem] })
  standalone_routines: RoutineProgressItem[];
}
