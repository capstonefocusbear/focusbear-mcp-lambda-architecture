import { Injectable } from '@nestjs/common';
import { DataSource, In, IsNull, Not } from 'typeorm';
import { FEATURE_FLAGS } from '@api-server/shared/utils/constants';
import { AppDataSource } from '../../../../ormconfig';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivitySequence } from '../../activity/entities/activity-sequence.entity';
import { Activity } from '../../activity/entities/activity.entity';
import { DeserializedActivity } from '../../activity/services/activity-parser/activity-parser.service';
import { GetUsersQueryDto } from '../dto/get-users-query.dto';
import { User, EmailFrequency } from '../entities/user.entity';
import { LogQuantityQuestion } from '../../activity/entities/log-quantity-questions';
import { StreakTypes } from '../domain/StreakTypes.enum';
import { GetLeaderBoardQuery } from '../dto/get-leader-board-query.dto';
import { Tutorial } from '../../activity/entities/tutorial.entity';
import { CustomRoutine } from '../entities/custom-routine';

const ACTIVE_WITHIN_FILTER = `
          AND (($3::int IS NULL) OR (users.last_time_stats_updated >= NOW() - (INTERVAL '1 day' * $3::int)))
`;

const LEADERBOARD_USER_AGGREGATE_SUBQUERY = `
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
        users.micro_breaks_number_days_completed,
        users.micro_breaks_num_days_of_stats,
        users.focus_modes_number_days_completed,
        users.focus_modes_num_days_of_stats,
        users.num_days_of_stats,
        users.number_days_completed,
        COUNT(daily_stats.id) AS item_count
        FROM users
        LEFT JOIN daily_stats ON daily_stats.user_id = users.id 
          AND daily_stats.date_completed >= NOW() - INTERVAL '90 days'
        WHERE users.created_at <= NOW() - INTERVAL '7 days' AND users.num_days_of_stats >= 7
${ACTIVE_WITHIN_FILTER}
        GROUP BY users.id
`;

const LEADERBOARD_ROW_NUMBER_ORDERING = `
        ORDER BY
          -- Primary sort: days completed in the last 90 days
          CASE
            WHEN $1 = 'focus_modes_streak' THEN focus_modes_number_days_completed
            WHEN $1 = 'morning_routines_streak' THEN morning_number_days_completed
            WHEN $1 = 'evening_routines_streak' THEN evening_number_days_completed
            ELSE micro_breaks_number_days_completed
          END DESC,
          -- Secondary: completion percentage in the last 90 days
          CASE
            WHEN $1 = 'focus_modes_streak' THEN (
              CASE WHEN focus_modes_num_days_of_stats > 0
                   THEN (focus_modes_number_days_completed::decimal / focus_modes_num_days_of_stats)
                   ELSE 0 END
            )
            WHEN $1 = 'morning_routines_streak' THEN morning_percent_number_day_of_stats_completed
            WHEN $1 = 'evening_routines_streak' THEN evening_percent_number_day_of_stats_completed
            ELSE micro_percent_number_day_of_stats_completed
          END DESC,
          -- Tertiary: current streak value
          CASE
            WHEN $1 = 'focus_modes_streak' THEN focus_modes_streak
            WHEN $1 = 'morning_routines_streak' THEN morning_routines_streak
            WHEN $1 = 'evening_routines_streak' THEN evening_routines_streak
            ELSE micro_breaks_streak
          END DESC,
          username
`;

@Injectable()
export class UserRepository extends BaseRepository<User> {
  private static readonly EMAIL_USER_SELECT_FIELDS = [
    'user.id',
    'user.auth0_id',
    'user.username',
    'user.language',
    'user.timezone',
    'user.created_at',
    'user.updated_at',
    'user.last_completed_sequence_at',
    'user.last_completed_focus_mode_at',
    'user.last_completed_sequence_started_at',
    'user.last_time_stats_updated',
    'user.metadata',
    'user.email_frequency',
    'user.feature_flags',
  ];

  constructor(private readonly dataSource: DataSource) {
    super(dataSource, User);
  }

  private dedupeForUpsert<T extends { id?: string }>(items: T[]): T[] {
    const seenIds = new Set<string>();
    const deduped: T[] = [];

    // Keep the last occurrence for a given id so later payload entries win.
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      const itemId = item?.id;

      if (!itemId) {
        deduped.unshift(item);
        continue;
      }

      if (seenIds.has(itemId)) continue;

      seenIds.add(itemId);
      deduped.unshift(item);
    }

    return deduped;
  }

  private getUserSequencePointerReset(
    user: Pick<
      User,
      | 'current_activity_sequence_id'
      | 'current_activity_id'
      | 'current_completing_sequence_log_id'
      | 'last_completed_sequence_id'
    >,
    deletedSequenceIds: string[],
  ): Partial<User> {
    const deletedIds = new Set(deletedSequenceIds);
    const userUpdate: Partial<User> = {};

    if (user.last_completed_sequence_id && deletedIds.has(user.last_completed_sequence_id)) {
      userUpdate.last_completed_sequence_id = null;
    }

    if (user.current_activity_sequence_id && deletedIds.has(user.current_activity_sequence_id)) {
      userUpdate.current_activity_sequence_id = null;
      userUpdate.current_activity_id = null;
      userUpdate.current_completing_sequence_log_id = null;
    }

    return userUpdate;
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
      // Batch upsert activity sequences and collect activities for deletion
      const sequencesToUpsert = this.dedupeForUpsert(activitiesData.map(({ sequence }) => sequence));
      const sequenceIdsToKeep = sequencesToUpsert.map((seq) => seq.id).filter((seqId) => !!seqId);

      const customRoutinesToUpsert = this.dedupeForUpsert(customRoutines);
      await queryRunner.manager.upsert(CustomRoutine, customRoutinesToUpsert, ['id']);
      const customRoutinesIdsToKeep = customRoutinesToUpsert
        .map((routine) => routine.id)
        .filter((routineId) => !!routineId);

      // Delete activity sequences that belong to custom routines being deleted
      // This must happen before deleting the custom routines to avoid orphaned sequences
      // Only delete sequences that are NOT in the sequencesToUpsert (i.e., sequences for deleted custom routines)
      if (customRoutinesIdsToKeep.length > 0) {
        // Get custom routine IDs from sequences that are being kept
        const keptCustomRoutineIds = new Set(
          sequencesToUpsert.map((seq) => seq.custom_routine_id).filter((customRoutineId) => !!customRoutineId),
        );

        // Delete sequences for custom routines that are being removed
        // Only delete if the sequence is not being kept AND the custom_routine_id is not in the kept list
        if (keptCustomRoutineIds.size > 0) {
          const sequencesToDelete = await queryRunner.manager.find(ActivitySequence, {
            select: { id: true },
            where: {
              user_id: id,
              custom_routine_id: Not(In(Array.from(keptCustomRoutineIds))),
              id: Not(In(sequenceIdsToKeep)),
            },
          });

          const pointerReset = await queryRunner.manager.findOne(User, {
            where: { id },
            select: {
              id: true,
              current_activity_sequence_id: true,
              current_activity_id: true,
              current_completing_sequence_log_id: true,
              last_completed_sequence_id: true,
            },
          });

          if (pointerReset) {
            const userUpdate = this.getUserSequencePointerReset(
              pointerReset,
              sequencesToDelete.map((sequence) => sequence.id),
            );

            if (Object.keys(userUpdate).length > 0) {
              await queryRunner.manager.update(User, { id }, userUpdate);
            }
          }

          await queryRunner.manager.delete(ActivitySequence, {
            user_id: id,
            custom_routine_id: Not(In(Array.from(keptCustomRoutineIds))),
            id: Not(In(sequenceIdsToKeep)),
          });
        } else {
          // If no custom routine sequences are being kept, delete all sequences with custom_routine_id
          const sequencesToDelete = await queryRunner.manager.find(ActivitySequence, {
            select: { id: true },
            where: {
              user_id: id,
              custom_routine_id: Not(IsNull()),
              id: Not(In(sequenceIdsToKeep)),
            },
          });

          const pointerReset = await queryRunner.manager.findOne(User, {
            where: { id },
            select: {
              id: true,
              current_activity_sequence_id: true,
              current_activity_id: true,
              current_completing_sequence_log_id: true,
              last_completed_sequence_id: true,
            },
          });

          if (pointerReset) {
            const userUpdate = this.getUserSequencePointerReset(
              pointerReset,
              sequencesToDelete.map((sequence) => sequence.id),
            );

            if (Object.keys(userUpdate).length > 0) {
              await queryRunner.manager.update(User, { id }, userUpdate);
            }
          }

          await queryRunner.manager.delete(ActivitySequence, {
            user_id: id,
            custom_routine_id: Not(IsNull()),
            id: Not(In(sequenceIdsToKeep)),
          });
        }

        await queryRunner.manager.delete(CustomRoutine, {
          user_id: id,
          id: Not(In(customRoutinesIdsToKeep)),
        });
      } else {
        const sequencesToDelete = await queryRunner.manager.find(ActivitySequence, {
          select: { id: true },
          where: {
            user_id: id,
            custom_routine_id: Not(IsNull()),
          },
        });

        const pointerReset = await queryRunner.manager.findOne(User, {
          where: { id },
          select: {
            id: true,
            current_activity_sequence_id: true,
            current_activity_id: true,
            current_completing_sequence_log_id: true,
            last_completed_sequence_id: true,
          },
        });

        if (pointerReset) {
          const userUpdate = this.getUserSequencePointerReset(
            pointerReset,
            sequencesToDelete.map((sequence) => sequence.id),
          );

          if (Object.keys(userUpdate).length > 0) {
            await queryRunner.manager.update(User, { id }, userUpdate);
          }
        }

        await queryRunner.manager.delete(ActivitySequence, {
          user_id: id,
          custom_routine_id: Not(IsNull()),
        });

        await queryRunner.manager.delete(CustomRoutine, {
          user_id: id,
        });
      }

      await queryRunner.manager.update(User, { id }, { ...updateData });

      // Collect all activity IDs to keep
      const allActivityIds = activitiesData.flatMap(({ activities }) => activities.map((activity) => activity.id));
      const allActivityIdsToKeep = new Set<string>(allActivityIds);

      await queryRunner.manager.upsert(ActivitySequence, sequencesToUpsert, ['id']);

      // Soft-delete activities that are no longer referenced (instead of hard delete)
      // This preserves completed_activities history — activity_id remains valid (SET NULL on hard delete path)
      await queryRunner.manager.update(
        Activity,
        {
          user_id: id,
          id: Not(In(Array.from(allActivityIdsToKeep))),
        },
        { is_deleted: true },
      );

      const activitiesArray = this.dedupeForUpsert(activitiesData.flatMap((sequence) => sequence.activities));
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
      await queryRunner.manager.upsert(LogQuantityQuestion, this.dedupeForUpsert(logQuantityQuestions), ['id']);
      await queryRunner.manager.upsert(Tutorial, this.dedupeForUpsert(tutorials), ['id']);

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
      .leftJoinAndSelect('activity_sequences.activities', 'activities', 'activities.is_deleted = false')
      .leftJoinAndSelect('activities.choices', 'choices', 'choices.is_deleted = false')
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
        'activities.geofence_id',
        'choices.id',
        'choices.log_quantity',
        'choices.duration_seconds',
        'choices.completion_requirements',
        'choices.log_summary_type',
        'choices.activity_type',
        'choices.activity_data',
        'choices.linked_activity_id',
        'choices.created_at',
        'choices.geofence_id',
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
      .leftJoin('users.teamToAdmin', 'teamToAdmin')
      .addSelect(['teamToAdmin.id'])
      .leftJoin('teamToAdmin.team', 'team')
      .addSelect(['team.id', 'team.name'])
      .where('users.id = :id', { id })
      .getOne();
  }

  async getUserSummary(id: string): Promise<User> {
    return this.orm
      .createQueryBuilder('users')
      .select([
        'users.id',
        'users.auth0_id',
        'users.stripe_customer_id',
        'users.username',
        'users.language',
        'users.has_consented_to_terms_of_service',
        'users.user_type',
        'users.has_consented_to_privacy_policy',
      ])
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
    active_within_days,
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
      micro_breaks_number_days_completed,
      micro_breaks_num_days_of_stats,
      focus_modes_number_days_completed,
      focus_modes_num_days_of_stats,
      num_days_of_stats,
      number_days_completed,
      item_count,
      ROW_NUMBER() OVER (
${LEADERBOARD_ROW_NUMBER_ORDERING}
        ) AS rank
      FROM
      (
${LEADERBOARD_USER_AGGREGATE_SUBQUERY}
        ) as result
      ORDER BY rank
      LIMIT $2
    `,
      [streak_type, limit, active_within_days ?? null],
    );
  }

  async getUserLeaderboardRank(userId: string, streakType: StreakTypes, activeWithinDays?: number): Promise<any> {
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
          micro_breaks_number_days_completed,
          micro_breaks_num_days_of_stats,
          focus_modes_number_days_completed,
          focus_modes_num_days_of_stats,
          num_days_of_stats,
          number_days_completed,
          item_count,
          ROW_NUMBER() OVER (
${LEADERBOARD_ROW_NUMBER_ORDERING}
          ) AS rank
          FROM
          (
${LEADERBOARD_USER_AGGREGATE_SUBQUERY}
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
        micro_breaks_number_days_completed,
        micro_breaks_num_days_of_stats,
        focus_modes_number_days_completed,
        focus_modes_num_days_of_stats,
        num_days_of_stats,
        number_days_completed,
        rank
      FROM leaderBoard
      WHERE id = $2
    `,
      [streakType, userId, activeWithinDays ?? null],
    );
    return result[0] || null;
  }

  private buildEmailUserQuery() {
    return this.orm.createQueryBuilder('user').select(UserRepository.EMAIL_USER_SELECT_FIELDS);
  }

  async getUsersForWeeklyEmailsBatch(skip = 0, take = 30, daysThreshold = 30): Promise<User[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    return this.buildEmailUserQuery()
      .where('user.email_frequency IN (:...frequencies)', {
        frequencies: [EmailFrequency.WEEKLY, EmailFrequency.DAILY],
      })
      .andWhere('user.feature_flags ? :featureFlag', { featureFlag: FEATURE_FLAGS.WEEKLY_EMAILS })
      .andWhere(
        '((user.last_completed_sequence_at IS NOT NULL AND user.last_completed_sequence_at >= :threshold) OR (user.last_completed_focus_mode_at IS NOT NULL AND user.last_completed_focus_mode_at >= :threshold))',
        { threshold: thresholdDate },
      )
      .orderBy('user.id', 'ASC')
      .skip(skip)
      .take(take)
      .getMany();
  }

  async getUsersForDailyEmailsBatch(skip = 0, take = 30, daysThreshold = 30): Promise<User[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    return this.buildEmailUserQuery()
      .where('user.email_frequency = :frequency', { frequency: EmailFrequency.DAILY })
      .andWhere('user.feature_flags ? :featureFlag', { featureFlag: FEATURE_FLAGS.DAILY_EMAILS })
      .andWhere(
        '((user.last_completed_sequence_at IS NOT NULL AND user.last_completed_sequence_at >= :threshold) OR (user.last_completed_focus_mode_at IS NOT NULL AND user.last_completed_focus_mode_at >= :threshold))',
        { threshold: thresholdDate },
      )
      .orderBy('user.id', 'ASC')
      .skip(skip)
      .take(take)
      .getMany();
  }

  async updateEmailFrequency(userId: string, frequency: EmailFrequency): Promise<void> {
    await this.update(userId, {
      email_frequency: frequency,
      updated_at: new Date(),
    });
  }

  async getUsersForMonthlyEmailsBatch(skip = 0, take = 30, daysThreshold = 30): Promise<User[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    return this.buildEmailUserQuery()
      .where('user.email_frequency IN (:...frequencies)', {
        frequencies: [EmailFrequency.MONTHLY, EmailFrequency.WEEKLY, EmailFrequency.DAILY],
      })
      .andWhere('user.feature_flags ? :featureFlag', { featureFlag: FEATURE_FLAGS.MONTHLY_EMAILS })
      .andWhere(
        '((user.last_completed_sequence_at IS NOT NULL AND user.last_completed_sequence_at >= :threshold) OR (user.last_completed_focus_mode_at IS NOT NULL AND user.last_completed_focus_mode_at >= :threshold))',
        { threshold: thresholdDate },
      )
      .orderBy('user.id', 'ASC')
      .skip(skip)
      .take(take)
      .getMany();
  }

  async getUsersForNoProgressEmailsBatch(skip = 0, take = 30, daysThreshold = 7): Promise<User[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    return this.buildEmailUserQuery()
      .where('user.email_frequency IN (:...frequencies)', {
        frequencies: [EmailFrequency.WEEKLY, EmailFrequency.DAILY],
      })
      .andWhere('user.feature_flags ? :featureFlag', { featureFlag: 'no_progress_emails' })
      .andWhere('(user.last_completed_sequence_at IS NULL OR user.last_completed_sequence_at < :threshold)', {
        threshold: thresholdDate,
      })
      .andWhere('(user.last_completed_focus_mode_at IS NULL OR user.last_completed_focus_mode_at < :threshold)', {
        threshold: thresholdDate,
      })
      .orderBy('user.id', 'ASC')
      .skip(skip)
      .take(take)
      .getMany();
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
