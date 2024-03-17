import { Injectable } from '@nestjs/common';
import { Connection, In, IsNull, Not } from 'typeorm';
import { AppDataSource } from '../../../../ormconfig';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivitySequence } from '../../activity/entities/activity-sequence.entity';
import { Activity } from '../../activity/entities/activity.entity';
import { DeserializedActivity } from '../../activity/services/activity-parser/activity-parser.service';
import { GetUsersQueryDto } from '../dto/get-users-query.dto';
import { User } from '../entities/user.entity';
import { LogQuantityQuestion } from '../../activity/entities/log-quantity-questions';
import { StreakTypes } from '../domain/StreakTypes.enum';
import { GetLeaderBoardQuery } from '../dto/get-leader-board-query.dto';
import { Tutorial } from '../../activity/entities/tutorial.entity';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(private readonly connection: Connection) {
    super(connection, User);
  }

  async consistentlyUpdateUserSettings(
    { id, ...updateData }: User,
    activitiesData: DeserializedActivity[],
    logQuantityQuestions: LogQuantityQuestion[],
    tutorials: Tutorial[],
  ) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.update(User, { id }, { ...updateData });
      await Promise.all(
        activitiesData.map(async ({ sequence, activities }) => {
          await queryRunner.manager.upsert(ActivitySequence, sequence, ['id']);
          const activityIdsToKeep = activities.map((activity) => activity.id);
          await queryRunner.manager.delete(Activity, {
            user_id: id,
            id: Not(In(activityIdsToKeep)),
            type: sequence.type,
          });
        }),
      );
      const activitiesArray = activitiesData.flatMap((sequence) => sequence.activities);
      const parentsWithoutLinks = activitiesArray.filter(
        ({ parent_id, linked_activity_id }) => !parent_id && !linked_activity_id,
      );
      const parentsWithLinks = activitiesArray.filter(
        ({ parent_id, linked_activity_id }) => !parent_id && linked_activity_id,
      );
      const choicesWithoutLinks = activitiesArray.filter(
        ({ parent_id, linked_activity_id }) => !!parent_id && !linked_activity_id,
      );
      const choicesWithLinks = activitiesArray.filter(
        ({ parent_id, linked_activity_id }) => !!parent_id && !!linked_activity_id,
      );
      await queryRunner.manager.upsert(Activity, parentsWithoutLinks, ['id']);
      await queryRunner.manager.upsert(Activity, parentsWithLinks, ['id']);
      await queryRunner.manager.upsert(Activity, choicesWithoutLinks, ['id']);
      await queryRunner.manager.upsert(Activity, choicesWithLinks, ['id']);
      // delete existing log quantity questions that aren't in the update data
      // and are linked to normal activities not activity templates
      const incomingQuestionIds = logQuantityQuestions
        .map((question) => question.id)
        .filter((questionId) => !!questionId);
      await queryRunner.manager.delete(LogQuantityQuestion, {
        user_id: id,
        id: Not(In(incomingQuestionIds)),
        activity_id: Not(IsNull()),
      });
      const tutorialIdsToKeep = tutorials.map((tutorial) => tutorial.id);
      await Promise.all(
        tutorials.map(async ({ activity_id, user_id }) => {
          await queryRunner.manager.delete(Tutorial, {
            user_id,
            activity_id,
            id: Not(In(tutorialIdsToKeep)),
          });
        }),
      );
      const questionsWithoutLinks = logQuantityQuestions.filter(({ linked_question_id }) => !linked_question_id);
      const questionsWithLinks = logQuantityQuestions.filter(({ linked_question_id }) => !!linked_question_id);
      await queryRunner.manager.upsert(LogQuantityQuestion, questionsWithoutLinks, ['id']);
      await queryRunner.manager.upsert(LogQuantityQuestion, questionsWithLinks, ['id']);
      await queryRunner.manager.upsert(Tutorial, tutorials, ['id']);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getUserSettings(id: string): Promise<User> {
    return this.orm
      .createQueryBuilder('users')
      .leftJoinAndSelect('users.activity_sequences', 'activity_sequences', 'activity_sequences.type != :standalone', {
        standalone: 'standalone',
      })
      .leftJoinAndSelect('activity_sequences.activities', 'activities', 'activities.activity_type != :standalone', {
        standalone: 'standalone',
      })
      .leftJoinAndSelect('activities.choices', 'choices')
      .leftJoinAndSelect('activities.log_quantity_questions', 'log_quantity_questions')
      .leftJoinAndSelect('choices.log_quantity_questions', 'choices_log_quantity_questions')
      .leftJoinAndSelect('activities.tutorials', 'tutorials')
      .select([
        'users.startup_time',
        'users.shutdown_time',
        'users.cutoff_time_for_non_high_priority_activities',
        'users.break_after_minutes',
        'users.has_edited_settings',
        'users.cutoff_time_for_high_priority_activities',
        'activities.id',
        'activities.log_quantity',
        'activities.duration_seconds',
        'activities.completion_requirements',
        'activities.log_summary_type',
        'activities.activity_type',
        'activities.activity_data',
        'activities.activity_sequence_id',
        'activities.activity_template_id',
        'activities.is_default',
        'activities.run_micro_breaks',
        'activities.days_of_week',
        'activities.linked_activity_id',
        'activities.check_list',
        'activities.impact_category',
        'activities.created_at',
        'activities.impact_category',
        'activities.cutoff_time_for_doing_activity',
        'choices.id',
        'choices.log_quantity',
        'choices.duration_seconds',
        'choices.completion_requirements',
        'choices.log_summary_type',
        'choices.activity_type',
        'choices.activity_data',
        'choices.linked_activity_id',
        'choices.created_at',
        'log_quantity_questions.id',
        'log_quantity_questions.question',
        'log_quantity_questions.min_value',
        'log_quantity_questions.max_value',
        'log_quantity_questions.min_value_description',
        'log_quantity_questions.max_value_description',
        'log_quantity_questions.log_summary_type',
        'log_quantity_questions.linked_question_id',
        'choices_log_quantity_questions.id',
        'choices_log_quantity_questions.question',
        'choices_log_quantity_questions.min_value',
        'choices_log_quantity_questions.max_value',
        'choices_log_quantity_questions.min_value_description',
        'choices_log_quantity_questions.max_value_description',
        'choices_log_quantity_questions.log_summary_type',
        'activity_sequences.type',
        'activity_sequences.id',
        'activity_sequences.activity_ids',
        'tutorials.id',
        'tutorials.name',
      ])
      .where('users.id = :id', { id })
      .getOne();
  }

  async getUserDetails(id: string): Promise<User> {
    return this.orm
      .createQueryBuilder('users')
      .leftJoinAndSelect('users.devices', 'devices')
      .leftJoinAndSelect('users.focus_modes', 'focus_modes')
      .leftJoinAndSelect('focus_modes.tags', 'tags')
      .where('users.id = :id', { id })
      .getOne();
  }

  async getUserCurrentActivityProps(id: string): Promise<Partial<User>> {
    return this.orm
      .createQueryBuilder('users')
      .leftJoinAndSelect('users.current_activity', 'current_activity')
      .leftJoinAndSelect('users.current_focus_mode', 'current_focus_mode')
      .leftJoinAndSelect('users.completing_focus_block', 'completing_focus_block')
      .leftJoinAndSelect('completing_focus_block.to_dos', 'to_dos')
      .leftJoinAndSelect('users.last_completed_sequence', 'last_completed_sequence')
      .leftJoinAndSelect('users.current_activity_sequence', 'current_activity_sequence')
      .where('users.id = :id', { id })
      .getOne();
  }

  async getUsersList({ search }: GetUsersQueryDto): Promise<User[]> {
    return this.orm
      .createQueryBuilder('users')
      .select([
        'users.id',
        'users.email',
        'users.name',
        'users.member_of_team_id',
        'users.owner_of_team_id',
        'users.created_at',
        'users.updated_at',
      ])
      .where('users.email ILIKE :search', { search })
      .getMany();
  }

  async getUserForAdmin(searchedId: string, stripe_customer_id: string) {
    const currentDate = new Date();
    const sevenDaysAgo = new Date(currentDate.setDate(currentDate.getDate() - 1));
    const query = this.orm
      .createQueryBuilder('users')
      .leftJoinAndSelect('users.focus_modes', 'focus_modes')
      .leftJoinAndSelect(
        'users.completed_activity_sequences',
        'completed_activity_sequences',
        'completed_activity_sequences.start_time >= :sevenDaysAgo AND completed_activity_sequences.is_completed = :is_completed',
      )
      .leftJoinAndSelect(
        'users.completed_focus_blocks',
        'completed_focus_blocks',
        'completed_focus_blocks.start_time >= :sevenDaysAgo',
      )
      .setParameters({ sevenDaysAgo, is_completed: true });

    if (searchedId) {
      query.andWhere('users.id = :id', { id: searchedId });
    }
    if (stripe_customer_id) {
      query.andWhere('users.stripe_customer_id = :stripe_customer_id', { stripe_customer_id });
    }
    return query.getOne();
  }

  async getLeaderboardRankingsByStreakType({
    streak_type = StreakTypes.MORNING_ROUTINES_STREAK,
    limit = 50,
  }: GetLeaderBoardQuery) {
    return this.orm.query(
      `
      SELECT 
          id, 
          username, 
          morning_routines_streak,
          evening_routines_streak,
          focus_modes_streak, 
          ROW_NUMBER() OVER (ORDER BY 
              CASE 
                WHEN $1 = 'focus_modes_streak' THEN focus_modes_streak
                WHEN $1 = 'morning_routines_streak' THEN morning_routines_streak
                ELSE evening_routines_streak
              END 
            DESC,
            username
          ) as rank
      FROM 
          users
      ORDER BY
          CASE 
            WHEN $1 = 'focus_modes_streak' THEN focus_modes_streak
            WHEN $1 = 'morning_routines_streak' THEN morning_routines_streak
            ELSE evening_routines_streak
          END
      DESC,
      username
      LIMIT $2
    `,
      [streak_type, limit],
    );
  }

  async getUserLeaderboardRank(userId: string, streakType: StreakTypes): Promise<any> {
    const result = await this.orm.query(
      `
        SELECT 
            id, 
            username, 
            morning_routines_streak,
            evening_routines_streak,
            focus_modes_streak,
            rank
        FROM 
            (
                SELECT 
                    id, 
                    username, 
                    morning_routines_streak,
                    evening_routines_streak,
                    focus_modes_streak,
                    RANK() OVER (
                        ORDER BY 
                          CASE 
                            WHEN $1 = 'focus_modes_streak' THEN focus_modes_streak
                            WHEN $1 = 'morning_routines_streak' THEN morning_routines_streak
                            ELSE evening_routines_streak
                          END 
                        DESC,
                        username
                    ) rank
                FROM 
                    users
            ) ranked_users
        WHERE 
            id = $2;
    `,
      [streakType, userId],
    );
    return result[0] || null;
  }
}
