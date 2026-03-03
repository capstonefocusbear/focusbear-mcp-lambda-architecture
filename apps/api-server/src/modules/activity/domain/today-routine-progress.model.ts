import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SequenceStatus } from './sequence-status.enum';

export class RoutineProgressItem {
  @ApiProperty()
  sequence_id: string;

  @ApiProperty({ enum: SequenceStatus, enumName: 'SequenceStatus' })
  status: SequenceStatus;

  @ApiPropertyOptional({ type: [String] })
  completed_habit_ids?: string[];

  @ApiPropertyOptional({ type: [String] })
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
