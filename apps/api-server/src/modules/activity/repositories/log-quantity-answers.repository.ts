import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { LogQuantityAnswer } from '../entities/log-quantity-answers';

@Injectable()
export class LogQuantityAnswersRepository extends BaseRepository<LogQuantityAnswer> {
  constructor(private readonly connection: Connection) {
    super(connection, LogQuantityAnswer);
  }
}
