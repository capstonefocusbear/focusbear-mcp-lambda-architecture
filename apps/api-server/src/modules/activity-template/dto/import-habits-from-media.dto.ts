import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export type HabitImportRoutineType = 'morning' | 'evening' | 'break';

export class HabitImportUploadedDto {
  @IsNotEmpty()
  @IsString()
  mediaKey!: string;

  @IsNotEmpty()
  @IsIn(['image', 'audio'])
  mediaType!: 'image' | 'audio';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  routineDurationMinutes?: number;

  @IsOptional()
  @IsString()
  @IsIn(['morning', 'evening', 'break'])
  routineType?: HabitImportRoutineType;
}

export interface ExtractedHabit {
  name: string;
  emoji?: string;
  description?: string;
  estimatedDurationMinutes?: number;
  category?: string;
  routineType?: HabitImportRoutineType;
}

export interface HabitSuggestionResult {
  extractedHabit: ExtractedHabit;
  matched: boolean;
  matchedTemplate?: {
    id: string;
    name?: string;
    description?: string;
    activityType: string;
    durationSeconds: number;
    matchScore: number;
    justification: string;
    habitIcon?: string;
  };
  suggestedHabit?: ExtractedHabit;
}

export interface HabitImportJobData {
  asyncTaskId: string;
  userId: string;
  mediaKey: string;
  mediaType: 'image' | 'audio';
  routineDurationMinutes?: number;
  routineType?: HabitImportRoutineType;
  requestHash: string;
  enqueuedAt: string;
}
