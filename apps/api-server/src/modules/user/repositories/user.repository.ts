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
import { CustomRoutine } from '../entities/custom-routine';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(private readonly connection: Connection) {
    super(connection, User);
  }

  /**
   * @param user - the user setting
   * @param activitiesData
   * @param logQuantityQuestions
   * @param tutorials
   * @param customRoutines
   *
   * 1: Update Custom routines - delete old custom routines and upsert new ones
   * 2: Update User - update the user settings
   * 3: Update Activity Sequences - delete old activity sequences and upsert new ones
   * 4: Update Activities - delete old activities and upsert new ones
   * 5: Update Log Quantity Questions - delete old log quantity questions and upsert new ones
   * 6: Update Tutorials - delete old tutorials and upsert new ones
   * 7: Delete old log quantity questions that aren't in the update data
   * 8: Delete old tutorials that aren't in the update data
   */
  async consistentlyUpdateUserSettings(
    { id, ...updateData }: User,
    activitiesData: DeserializedActivity[],
    logQuantityQuestions: LogQuantityQuestion[],
    tutorials: Tutorial[],
    customRoutines: CustomRoutine[],
  ) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.upsert(CustomRoutine, customRoutines, ['id']);
      const customRoutinesIdsToKeep = customRoutines.map((routine) => routine.id);
      await queryRunner.manager.delete(CustomRoutine, {
        user_id: id,
        id: Not(In(customRoutinesIdsToKeep)),
      });

      await queryRunner.manager.update(User, { id }, { ...updateData });

      // Batch upsert activity sequences and collect activities for deletion
      const sequencesToUpsert = activitiesData.map(({ sequence }) => sequence);
      // Collect all activity IDs to keep
      const allActivityIds = activitiesData.flatMap(({ activities }) => activities.map((activity) => activity.id));
      const allActivityIdsToKeep = new Set<string>(allActivityIds);

      // Batch upsert all sequences
      await queryRunner.manager.upsert(ActivitySequence, sequencesToUpsert, ['id']);

      // Batch delete activities
      await queryRunner.manager.delete(Activity, {
        user_id: id,
        id: Not(In(Array.from(allActivityIdsToKeep))),
      });

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
      // Need to insert parent activities first, then choices activities due to foreign key relationships

      // Combine parent activities and child activities into two batch operations
      const allParentActivities = [...parentsWithoutLinks, ...parentsWithLinks];
      const allChildActivities = [...choicesWithoutLinks, ...choicesWithLinks];

      // Insert in order: parents first, then choices (to maintain foreign key integrity)
      await queryRunner.manager.upsert(Activity, allParentActivities, ['id']);
      await queryRunner.manager.upsert(Activity, allChildActivities, ['id']);

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
      const tutorialActivityIdsToKeep = tutorials.map((tutorial) => tutorial.activity_id);

      await queryRunner.manager.update(
        Tutorial,
        {
          user_id: id,
          activity_id: Not(In(tutorialActivityIdsToKeep)),
        },
        { activity_id: null },
      );

      // Batch upsert all log quantity questions in a single operation
      await queryRunner.manager.upsert(LogQuantityQuestion, logQuantityQuestions, ['id']);
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
      .leftJoinAndSelect('users.activity_sequences', 'activity_sequences')
      .leftJoinAndSelect('activity_sequences.activities', 'activities')
      .leftJoinAndSelect('activities.choices', 'choices')
      .leftJoinAndSelect('activities.log_quantity_questions', 'log_quantity_questions')
      .leftJoinAndSelect('choices.log_quantity_questions', 'choices_log_quantity_questions')
      .leftJoinAndSelect('activities.tutorial', 'tutorial')
      .select([
        'users.startup_time',
        'users.shutdown_time',
        'users.cutoff_time_for_non_high_priority_activities',
        'users.break_after_minutes',
        'users.has_edited_settings',
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
        'activity_sequences.custom_routine_id',
        'tutorial.id',
      ])
      .where('users.id = :id', { id })
      .getOne();
  }

  async getUserDetails(id: string): Promise<User> {
    return this.orm
      .createQueryBuilder('users')
      .leftJoinAndSelect('users.focus_modes', 'focus_modes')
      .leftJoinAndSelect('focus_modes.tags', 'tags')
      .leftJoin('users.teamToAdmin', 'teamToAdmin')
      .addSelect(['teamToAdmin.id'])
      .leftJoin('teamToAdmin.team', 'team')
      .addSelect(['team.id', 'team.name'])
      .where('users.id = :id', { id })
      .getOne();
  }

  async getUserCurrentActivityProps(id: string): Promise<Partial<User>> {
    const user = await this.orm
      .createQueryBuilder('users')
      .leftJoinAndSelect('users.current_activity', 'current_activity')
      .leftJoinAndSelect('users.current_focus_mode', 'current_focus_mode')
      .leftJoinAndSelect('users.completing_focus_block', 'completing_focus_block')
      .leftJoinAndSelect('completing_focus_block.to_dos', 'to_dos')
      .leftJoinAndSelect('users.last_completed_sequence', 'last_completed_sequence')
      .leftJoinAndSelect('users.current_activity_sequence', 'current_activity_sequence')
      .leftJoinAndSelect('current_activity_sequence.custom_routine', 'custom_routine')
      .leftJoinAndSelect('last_completed_sequence.custom_routine', 'last_completed_sequence.custom_routine')
      .where('users.id = :id', { id })
      .getOne();

    this.removeUnwantedProperties(user?.current_activity_sequence);
    this.removeUnwantedProperties(user?.last_completed_sequence);

    return user;
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
      micro_breaks_streak,
      morning_percent_number_day_of_stats_completed,
      evening_percent_number_day_of_stats_completed,
      micro_percent_number_day_of_stats_completed,
      morning_number_days_completed,
      morning_num_days_of_stats,
      evening_number_days_completed,
      evening_num_days_of_stats,
      num_days_of_stats,
      number_days_completed,
      item_count,
      ROW_NUMBER() OVER (ORDER BY
            CASE 
              WHEN $1 = 'focus_modes_streak' THEN focus_modes_streak
              WHEN $1 = 'morning_routines_streak' THEN morning_percent_number_day_of_stats_completed
              WHEN $1 = 'evening_routines_streak' THEN evening_percent_number_day_of_stats_completed
              ELSE micro_percent_number_day_of_stats_completed
            END
        DESC,
        CASE 
          WHEN $1 = 'focus_modes_streak' THEN focus_modes_streak
          WHEN $1 = 'morning_routines_streak' THEN morning_routines_streak
          WHEN $1 = 'evening_routines_streak' THEN evening_routines_streak
          ELSE micro_breaks_streak
        END
        DESC,
        username) AS rank
      FROM
      (
        SELECT 
        users.id, 
        users.username, 
        users.morning_routines_streak,
        users.evening_routines_streak,
        users.focus_modes_streak,
        users.micro_breaks_streak,
        users.morning_percent_number_day_of_stats_completed,
        users.evening_percent_number_day_of_stats_completed,
        users.micro_percent_number_day_of_stats_completed,
        users.morning_number_days_completed,
        users.morning_num_days_of_stats,
        users.evening_number_days_completed,
        users.evening_num_days_of_stats,
        users.num_days_of_stats,
        users.number_days_completed,
        COUNT(daily_stats.id) AS item_count
        FROM users
        LEFT JOIN daily_stats ON daily_stats.user_id = users.id 
          AND daily_stats.date_completed >= NOW() - INTERVAL '90 days'
        WHERE users.created_at <= NOW() - INTERVAL '7 days' AND users.num_days_of_stats >= 7
        GROUP BY users.id
        ) as result
        LIMIT $2
    `,
      [streak_type, limit],
    );
  }

  async getUserLeaderboardRank(userId: string, streakType: StreakTypes): Promise<any> {
    const result = await this.orm.query(
      `
        WITH leaderBoard AS
        (
          SELECT
          id, 
          username, 
          morning_routines_streak,
          evening_routines_streak,
          focus_modes_streak,
          micro_breaks_streak,
          morning_percent_number_day_of_stats_completed,
          evening_percent_number_day_of_stats_completed,
          micro_percent_number_day_of_stats_completed,
          morning_number_days_completed,
          morning_num_days_of_stats,
          evening_number_days_completed,
          evening_num_days_of_stats,
          num_days_of_stats,
          number_days_completed,
          item_count,
          ROW_NUMBER() OVER (ORDER BY
                CASE 
                  WHEN $1 = 'focus_modes_streak' THEN focus_modes_streak
                  WHEN $1 = 'morning_routines_streak' THEN morning_percent_number_day_of_stats_completed
                  WHEN $1 = 'evening_routines_streak' THEN evening_percent_number_day_of_stats_completed
                  ELSE micro_percent_number_day_of_stats_completed
                END
            DESC,
              CASE 
                WHEN $1 = 'focus_modes_streak' THEN focus_modes_streak
                WHEN $1 = 'morning_routines_streak' THEN morning_routines_streak
                WHEN $1 = 'evening_routines_streak' THEN evening_routines_streak
                ELSE micro_breaks_streak
              END
            DESC,
            username) AS rank
          FROM
          (
            SELECT 
            users.id, 
            users.username, 
            users.morning_routines_streak,
            users.evening_routines_streak,
            users.focus_modes_streak,
            users.micro_breaks_streak,
            users.morning_percent_number_day_of_stats_completed,
            users.evening_percent_number_day_of_stats_completed,
            users.micro_percent_number_day_of_stats_completed,
            users.morning_number_days_completed,
            users.morning_num_days_of_stats,
            users.evening_number_days_completed,
            users.evening_num_days_of_stats,
            users.num_days_of_stats,
            users.number_days_completed,
            COUNT(daily_stats.id) AS item_count
            FROM 
                users
            LEFT JOIN daily_stats ON daily_stats.user_id = users.id 
              AND daily_stats.date_completed >= NOW() - INTERVAL '90 days'
            WHERE 
              users.created_at <= NOW() - INTERVAL '7 days' AND users.num_days_of_stats >= 7
            GROUP BY users.id
          ) as result 
        )

      SELECT 
        id, 
        username, 
        morning_routines_streak,
        evening_routines_streak,
        focus_modes_streak,
        micro_breaks_streak,
        morning_percent_number_day_of_stats_completed,
        evening_percent_number_day_of_stats_completed,
        micro_percent_number_day_of_stats_completed,
        morning_number_days_completed,
        morning_num_days_of_stats,
        evening_number_days_completed,
        evening_num_days_of_stats,
        num_days_of_stats,
        number_days_completed,
        rank
      FROM leaderBoard
      WHERE id = $2
    `,
      [streakType, userId],
    );
    return result[0] || null;
  }

  /* eslint-disable no-param-reassign */
  private removeUnwantedProperties(sequence?: ActivitySequence) {
    if (sequence?.custom_routine) {
      sequence.custom_routine.user_id = undefined;
    }
    if (sequence?.custom_routine_id) {
      sequence.custom_routine_id = undefined;
    }
  }
  /* eslint-enable no-param-reassign */
}
