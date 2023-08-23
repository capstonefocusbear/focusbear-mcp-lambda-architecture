import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { UserFeedback } from '../entities/user-feedback.entity';

@Injectable()
export class UserFeedbackRepository extends BaseRepository<UserFeedback> {
  constructor(private readonly connection: Connection) {
    super(connection, UserFeedback);
  }
}
