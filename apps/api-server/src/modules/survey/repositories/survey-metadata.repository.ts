import { Connection } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { SurveyMetadata } from '../entities/survey-metadata.entity';
import { CreateSurveyMetaDto } from '../dto/create-survey-metadata.dto';

@Injectable()
export class SurveyMetadataRepository extends BaseRepository<SurveyMetadata> {
  constructor(private readonly connection: Connection) {
    super(connection, SurveyMetadata);
  }

  async createSurveyAnswerMetadata(
    createSurveyMetaDto: CreateSurveyMetaDto,
    survey_id: string,
    user_id: string,
    survey_answer_id: string,
  ) {
    const newSurveyAnswerMetadata = new SurveyMetadata({
      ...createSurveyMetaDto,
      survey_id,
      user_id,
      survey_answer_id,
    });
    await this.orm.save(newSurveyAnswerMetadata);
  }
}
