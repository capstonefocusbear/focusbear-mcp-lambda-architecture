import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'apps/api-server/src/shared/repositories/base-repository.repository';
import { Connection } from 'typeorm';
import { SavedWebsite } from '../entities/saved-website.entity';

@Injectable()
export class SavedWebsiteRepository extends BaseRepository<SavedWebsite> {
  constructor(private readonly connection: Connection) {
    super(connection, SavedWebsite);
  }
}
