import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Tutorial } from '../entities/tutorial.entity';

@Injectable()
export class TutorialsRepository extends BaseRepository<Tutorial> {
  constructor(private readonly connection: Connection) {
    super(connection, Tutorial);
  }
}
