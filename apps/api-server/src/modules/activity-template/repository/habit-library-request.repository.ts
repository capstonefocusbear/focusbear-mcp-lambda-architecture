import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { HabitLibraryRequest } from '../entity/habit-library-request.entity';

export interface HabitLibraryRequestRecord {
  userId?: string | null;
  goal: string;
  habitName: string;
  habitDescription?: string | null;
  routineType?: string | null;
  durationMinutes?: number | null;
  justification?: string | null;
  requestMetadata?: Record<string, unknown> | null;
}

@Injectable()
export class HabitLibraryRequestRepository extends BaseRepository<HabitLibraryRequest> {
  constructor(connection: Connection) {
    super(connection, HabitLibraryRequest);
  }

  async logRequests(records: HabitLibraryRequestRecord[]): Promise<void> {
    if (!records.length) {
      return;
    }

    const entities = records.map(
      (record) =>
        new HabitLibraryRequest(
          {
            user_id: record.userId ?? null,
            goal: record.goal,
            habit_name: record.habitName,
            habit_description: record.habitDescription ?? null,
            routine_type: record.routineType ?? null,
            duration_minutes: record.durationMinutes ?? null,
            justification: record.justification ?? null,
            request_metadata: record.requestMetadata ?? null,
          },
          { generateId: true },
        ),
    );

    await this.orm.save(entities);
  }
}
