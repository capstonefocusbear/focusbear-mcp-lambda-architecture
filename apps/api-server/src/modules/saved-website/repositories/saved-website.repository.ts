import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { SavedWebsite } from '../entities/saved-website.entity';

@Injectable()
export class SavedWebsiteRepository extends BaseRepository<SavedWebsite> {
  constructor(private readonly connection: Connection) {
    super(connection, SavedWebsite);
  }
}
