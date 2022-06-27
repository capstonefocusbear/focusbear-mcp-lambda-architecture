import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Activity } from '../entities/activity.entity';

@Injectable()
export class ActivityRepository extends BaseRepository<Activity> {
  constructor(private readonly connection: Connection) {
    super(connection, Activity);
  }
}
