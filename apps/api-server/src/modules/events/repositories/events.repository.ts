import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ImpactEvent } from '../entities/impact-event.entity';

@Injectable()
export class EventsRepository extends BaseRepository<ImpactEvent> {
  constructor(private readonly connection: Connection) {
    super(connection, ImpactEvent);
  }
}
