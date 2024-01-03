import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { CalendarExcludedKeyword } from '../entities/calendar-excluded-keywords.entity';

@Injectable()
export class CalendarExcluededKeywordRepository extends BaseRepository<CalendarExcludedKeyword> {
  constructor(private readonly connection: Connection) {
    super(connection, CalendarExcludedKeyword);
  }
}
