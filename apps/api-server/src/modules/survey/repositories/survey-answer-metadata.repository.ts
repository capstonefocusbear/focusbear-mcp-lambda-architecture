import { Connection } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { SurveyAnswerMetadata } from '../entities/survey-answer-metadata.entity';
import { CreateSurveyAnswerMetaDto } from '../dto/create-survey-answer-metadata.dto';

@Injectable()
export class SurveyAnswerMetadataRepository extends BaseRepository<SurveyAnswerMetadata> {
  constructor(private readonly connection: Connection) {
    super(connection, SurveyAnswerMetadata);
  }

  async createSurveyAnswerMetadata(
    createSurveyAnswerMetaDto: CreateSurveyAnswerMetaDto,
    survey_id: string,
    user_id: string,
    survey_answer_id: string,
  ) {
    const newSurveyAnswerMetadata = new SurveyAnswerMetadata({
      ...createSurveyAnswerMetaDto,
      survey_id,
      user_id,
      survey_answer_id,
    });
    await this.orm.save(newSurveyAnswerMetadata);
  }
}
