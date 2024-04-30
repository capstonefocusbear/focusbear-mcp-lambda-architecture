import { Connection } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Survey } from '../entities/survey.entity';
import { CreateSurveyDto } from '../dto/create-survey.dto';

@Injectable()
export class SurveyRepository extends BaseRepository<Survey> {
  constructor(private readonly connection: Connection) {
    super(connection, Survey);
  }

  async createSurvey(createSurveyDto: CreateSurveyDto, user_id: string) {
    const newSurvey = new Survey({ ...createSurveyDto, creator: user_id });
    await this.orm.save(newSurvey);
  }
}
