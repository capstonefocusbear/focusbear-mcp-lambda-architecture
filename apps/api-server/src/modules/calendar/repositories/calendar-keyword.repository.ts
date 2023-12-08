import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { CalendarKeyword } from '../entities/calendar-keywords.entity';

@Injectable()
export class CalendarKeywordRepository extends BaseRepository<CalendarKeyword> {
  constructor(private readonly connection: Connection) {
    super(connection, CalendarKeyword);
  }
}
