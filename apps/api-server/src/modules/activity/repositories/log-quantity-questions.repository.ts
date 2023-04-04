import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { LogQuantityQuestion } from '../entities/log-quantity-questions';

@Injectable()
export class LogQuantityQuestionsRepository extends BaseRepository<LogQuantityQuestion> {
  constructor(private readonly connection: Connection) {
    super(connection, LogQuantityQuestion);
  }
}
