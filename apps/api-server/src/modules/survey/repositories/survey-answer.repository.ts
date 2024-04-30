import { Connection } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { SurveyAnswer } from '../entities/survey-answer.entity';

@Injectable()
export class SurveyAnswerRepository extends BaseRepository<SurveyAnswer> {
  constructor(private readonly connection: Connection) {
    super(connection, SurveyAnswer);
  }
}
