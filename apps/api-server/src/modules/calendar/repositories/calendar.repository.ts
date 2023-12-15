import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Calendar } from '../entities/calendar.entity';

@Injectable()
export class CalendarRepository extends BaseRepository<Calendar> {
  constructor(private readonly connection: Connection) {
    super(connection, Calendar);
  }
}
