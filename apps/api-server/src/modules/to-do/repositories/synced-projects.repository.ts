import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { SyncedProject } from '../entities/synced-project.entity';

@Injectable()
export class SyncedProjectsRepository extends BaseRepository<SyncedProject> {
  constructor(private readonly connection: Connection) {
    super(connection, SyncedProject);
  }
}
