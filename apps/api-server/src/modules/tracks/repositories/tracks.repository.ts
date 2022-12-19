import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Track } from '../entities/track.entity';

@Injectable()
export class TracksRepository extends BaseRepository<Track> {
  constructor(private readonly connection: Connection) {
    super(connection, Track);
  }
}
