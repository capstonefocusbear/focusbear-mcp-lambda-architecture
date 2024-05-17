import { Connection } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { PaginationOptionsDto } from '../../../shared/pagination/pagination-options.dto';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Survey } from '../entities/survey.entity';
import { CreateSurveyDto } from '../dto/create-survey.dto';
import { SurveyAnswer } from '../entities/survey-answer.entity';

@Injectable()
export class SurveyRepository extends BaseRepository<Survey> {
  constructor(private readonly connection: Connection) {
    super(connection, Survey);
  }

  async createSurvey(createSurveyDto: CreateSurveyDto, user_id: string) {
    const newSurvey = new Survey({ ...createSurveyDto, creator: user_id });
    await this.orm.save(newSurvey);
  }

  async getUserSurvey(id: string, user_id: string) {
    return this.orm.findOne({
      where: {
        id,
        creator: user_id,
      },
    });
  }

  async getSurvey(id: string) {
    return this.orm.findOne({
      where: {
        id,
      },
    });
  }

  async updateSurvey(survey: Survey) {
    await this.orm.save(survey);
  }

  async getUserUnansweredSurveys() {
    return this.orm
      .createQueryBuilder('survey')
      .select('survey')
      .innerJoin(SurveyAnswer, 'answer', 'answer.survey_id != survey.id')
      .getMany();
  }

  async getUserSurveys(user_id: string, completed: boolean) {
    return this.orm
      .createQueryBuilder('survey')
      .select('survey')
      .leftJoinAndSelect(SurveyAnswer, 'answer', 'survey.id = answer.survey_id')
      .where('survey.creator = :user_id', { user_id })
      .andWhere('answer.completed = :completed', { completed })
      .getMany();
  }

  async getSurveys({ order, skip, take }: PaginationOptionsDto) {
    return this.orm.findAndCount({
      order: { created_at: order },
      skip,
      take,
    });
  }
}
