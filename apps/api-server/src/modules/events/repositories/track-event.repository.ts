import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { TrackEvent } from '../entities/track-event.entity';

@Injectable()
export class TrackEventRepository extends BaseRepository<TrackEvent> {
  constructor(private readonly connection: Connection) {
    super(connection, TrackEvent);
  }
}
