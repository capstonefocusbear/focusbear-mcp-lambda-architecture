import { Connection } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { SurveyAnswer } from '../entities/survey-answer.entity';

@Injectable()
export class SurveyAnswerRepository extends BaseRepository<SurveyAnswer> {
  constructor(private readonly connection: Connection) {
    super(connection, SurveyAnswer);
  }

  async createSurveyAnswer(
    answer: { reply: string; rating?: number; completed?: boolean },
    survey_id: string,
    user_id: string,
  ) {
    const newSurveyAnswer = new SurveyAnswer({
      ...answer,
      survey_id,
      user_id,
    });
    return await this.orm.save(newSurveyAnswer);
  }

  async updateSurveyAnswerCompletion(survey_id: string, user_id: string, completed: boolean) {
    await this.orm
      .createQueryBuilder()
      .update(SurveyAnswer)
      .set({
        completed,
      })
      .where('survey_id: =survey_id', { survey_id })
      .andWhere('user_id: =user_id', { user_id })
      .execute();
  }
}
