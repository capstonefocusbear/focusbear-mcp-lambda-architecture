"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var UserRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const constants_1 = require("../../../shared/utils/constants");
const ormconfig_1 = require("../../../../ormconfig");
const base_repository_repository_1 = require("../../../shared/repositories/base-repository.repository");
const activity_sequence_entity_1 = require("../../activity/entities/activity-sequence.entity");
const activity_entity_1 = require("../../activity/entities/activity.entity");
const user_entity_1 = require("../entities/user.entity");
const log_quantity_questions_1 = require("../../activity/entities/log-quantity-questions");
const StreakTypes_enum_1 = require("../domain/StreakTypes.enum");
const tutorial_entity_1 = require("../../activity/entities/tutorial.entity");
const custom_routine_1 = require("../entities/custom-routine");
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
let UserRepository = UserRepository_1 = class UserRepository extends base_repository_repository_1.BaseRepository {
    constructor(dataSource) {
        super(dataSource, user_entity_1.User);
        this.dataSource = dataSource;
    }
    dedupeForUpsert(items) {
        const seenIds = new Set();
        const dedupedReversed = [];
        for (let index = items.length - 1; index >= 0; index -= 1) {
            const item = items[index];
            const itemId = item === null || item === void 0 ? void 0 : item.id;
            if (!itemId) {
                dedupedReversed.push(item);
                continue;
            }
            if (seenIds.has(itemId))
                continue;
            seenIds.add(itemId);
            dedupedReversed.push(item);
        }
        return dedupedReversed.reverse();
    }
    getUserSequencePointerReset(user, deletedSequenceIds) {
        const deletedIds = new Set(deletedSequenceIds);
        const userUpdate = {};
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
    async resetUserPointersBeforeDelete(queryRunner, userId, sequenceWhere) {
        const sequencesToDelete = await queryRunner.manager.find(activity_sequence_entity_1.ActivitySequence, {
            select: { id: true },
            where: sequenceWhere,
        });
        if (sequencesToDelete.length === 0) {
            return {};
        }
        const pointerReset = await queryRunner.manager.findOne(user_entity_1.User, {
            where: { id: userId },
            select: {
                id: true,
                current_activity_sequence_id: true,
                current_activity_id: true,
                current_completing_sequence_log_id: true,
                last_completed_sequence_id: true,
            },
        });
        if (!pointerReset) {
            return {};
        }
        const userUpdate = this.getUserSequencePointerReset(pointerReset, sequencesToDelete.map((sequence) => sequence.id));
        if (Object.keys(userUpdate).length > 0) {
            await queryRunner.manager.update(user_entity_1.User, { id: userId }, userUpdate);
        }
        return userUpdate;
    }
    async consistentlyUpdateUserSettings(_a, activitiesData, logQuantityQuestions, tutorials, customRoutines) {
        var { id } = _a, updateData = __rest(_a, ["id"]);
        const queryRunner = ormconfig_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const sequencesToUpsert = this.dedupeForUpsert(activitiesData.map(({ sequence }) => sequence));
            const sequenceIdsToKeep = sequencesToUpsert.map((seq) => seq.id).filter((seqId) => !!seqId);
            const pendingUserPointerReset = {};
            const customRoutinesToUpsert = this.dedupeForUpsert(customRoutines);
            await queryRunner.manager.upsert(custom_routine_1.CustomRoutine, customRoutinesToUpsert, ['id']);
            const customRoutinesIdsToKeep = customRoutinesToUpsert
                .map((routine) => routine.id)
                .filter((routineId) => !!routineId);
            if (customRoutinesIdsToKeep.length > 0) {
                const keptCustomRoutineIds = new Set(sequencesToUpsert.map((seq) => seq.custom_routine_id).filter((customRoutineId) => !!customRoutineId));
                if (keptCustomRoutineIds.size > 0) {
                    Object.assign(pendingUserPointerReset, await this.resetUserPointersBeforeDelete(queryRunner, id, {
                        user_id: id,
                        custom_routine_id: (0, typeorm_1.Not)((0, typeorm_1.In)(Array.from(keptCustomRoutineIds))),
                        id: (0, typeorm_1.Not)((0, typeorm_1.In)(sequenceIdsToKeep)),
                    }));
                    await queryRunner.manager.delete(activity_sequence_entity_1.ActivitySequence, {
                        user_id: id,
                        custom_routine_id: (0, typeorm_1.Not)((0, typeorm_1.In)(Array.from(keptCustomRoutineIds))),
                        id: (0, typeorm_1.Not)((0, typeorm_1.In)(sequenceIdsToKeep)),
                    });
                }
                else {
                    Object.assign(pendingUserPointerReset, await this.resetUserPointersBeforeDelete(queryRunner, id, {
                        user_id: id,
                        custom_routine_id: (0, typeorm_1.Not)((0, typeorm_1.IsNull)()),
                        id: (0, typeorm_1.Not)((0, typeorm_1.In)(sequenceIdsToKeep)),
                    }));
                    await queryRunner.manager.delete(activity_sequence_entity_1.ActivitySequence, {
                        user_id: id,
                        custom_routine_id: (0, typeorm_1.Not)((0, typeorm_1.IsNull)()),
                        id: (0, typeorm_1.Not)((0, typeorm_1.In)(sequenceIdsToKeep)),
                    });
                }
                await queryRunner.manager.delete(custom_routine_1.CustomRoutine, {
                    user_id: id,
                    id: (0, typeorm_1.Not)((0, typeorm_1.In)(customRoutinesIdsToKeep)),
                });
            }
            else {
                Object.assign(pendingUserPointerReset, await this.resetUserPointersBeforeDelete(queryRunner, id, {
                    user_id: id,
                    custom_routine_id: (0, typeorm_1.Not)((0, typeorm_1.IsNull)()),
                }));
                await queryRunner.manager.delete(activity_sequence_entity_1.ActivitySequence, {
                    user_id: id,
                    custom_routine_id: (0, typeorm_1.Not)((0, typeorm_1.IsNull)()),
                });
                await queryRunner.manager.delete(custom_routine_1.CustomRoutine, {
                    user_id: id,
                });
            }
            await queryRunner.manager.update(user_entity_1.User, { id }, Object.assign(Object.assign({}, updateData), pendingUserPointerReset));
            const allActivityIds = activitiesData.flatMap(({ activities }) => activities.map((activity) => activity.id));
            const allActivityIdsToKeep = new Set(allActivityIds);
            await queryRunner.manager.upsert(activity_sequence_entity_1.ActivitySequence, sequencesToUpsert, ['id']);
            await queryRunner.manager.update(activity_entity_1.Activity, {
                user_id: id,
                id: (0, typeorm_1.Not)((0, typeorm_1.In)(Array.from(allActivityIdsToKeep))),
            }, { is_deleted: true });
            const activitiesArray = this.dedupeForUpsert(activitiesData.flatMap((sequence) => sequence.activities));
            const parentsWithoutLinks = activitiesArray.filter(({ parent_id, linked_activity_id }) => !parent_id && !linked_activity_id);
            const parentsWithLinks = activitiesArray.filter(({ parent_id, linked_activity_id }) => !parent_id && linked_activity_id);
            const choicesWithoutLinks = activitiesArray.filter(({ parent_id, linked_activity_id }) => !!parent_id && !linked_activity_id);
            const choicesWithLinks = activitiesArray.filter(({ parent_id, linked_activity_id }) => !!parent_id && !!linked_activity_id);
            const allParentActivities = [...parentsWithoutLinks, ...parentsWithLinks];
            const allChildActivities = [...choicesWithoutLinks, ...choicesWithLinks];
            await queryRunner.manager.upsert(activity_entity_1.Activity, allParentActivities, ['id']);
            await queryRunner.manager.upsert(activity_entity_1.Activity, allChildActivities, ['id']);
            const incomingQuestionIds = logQuantityQuestions
                .map((question) => question.id)
                .filter((questionId) => !!questionId);
            await queryRunner.manager.delete(log_quantity_questions_1.LogQuantityQuestion, {
                user_id: id,
                id: (0, typeorm_1.Not)((0, typeorm_1.In)(incomingQuestionIds)),
                activity_id: (0, typeorm_1.Not)((0, typeorm_1.IsNull)()),
            });
            const tutorialActivityIdsToKeep = tutorials.map((tutorial) => tutorial.activity_id);
            await queryRunner.manager.update(tutorial_entity_1.Tutorial, {
                user_id: id,
                activity_id: (0, typeorm_1.Not)((0, typeorm_1.In)(tutorialActivityIdsToKeep)),
            }, { activity_id: null });
            await queryRunner.manager.upsert(log_quantity_questions_1.LogQuantityQuestion, this.dedupeForUpsert(logQuantityQuestions), ['id']);
            await queryRunner.manager.upsert(tutorial_entity_1.Tutorial, this.dedupeForUpsert(tutorials), ['id']);
            await queryRunner.commitTransaction();
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async getUserSettings(id) {
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
    async getUserDetails(id) {
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
    async getUserSummary(id) {
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
    async getUserCurrentActivityProps(id) {
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
        this.removeUnwantedProperties(user === null || user === void 0 ? void 0 : user.current_activity_sequence);
        this.removeUnwantedProperties(user === null || user === void 0 ? void 0 : user.last_completed_sequence);
        return user;
    }
    async getUsersList({ search }) {
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
    async getUserForAdmin(searchedId, stripe_customer_id) {
        const currentDate = new Date();
        const sevenDaysAgo = new Date(currentDate.setDate(currentDate.getDate() - 1));
        const query = this.orm
            .createQueryBuilder('users')
            .leftJoinAndSelect('users.focus_modes', 'focus_modes')
            .leftJoinAndSelect('users.completed_activity_sequences', 'completed_activity_sequences', 'completed_activity_sequences.start_time >= :sevenDaysAgo AND completed_activity_sequences.is_completed = :is_completed')
            .leftJoinAndSelect('users.completed_focus_blocks', 'completed_focus_blocks', 'completed_focus_blocks.start_time >= :sevenDaysAgo')
            .setParameters({ sevenDaysAgo, is_completed: true });
        if (searchedId) {
            query.andWhere('users.id = :id', { id: searchedId });
        }
        if (stripe_customer_id) {
            query.andWhere('users.stripe_customer_id = :stripe_customer_id', { stripe_customer_id });
        }
        return query.getOne();
    }
    async getLeaderboardRankingsByStreakType({ streak_type = StreakTypes_enum_1.StreakTypes.MORNING_ROUTINES_STREAK, limit = 50, active_within_days, }) {
        return this.orm.query(`
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
    `, [streak_type, limit, active_within_days !== null && active_within_days !== void 0 ? active_within_days : null]);
    }
    async getUserLeaderboardRank(userId, streakType, activeWithinDays) {
        const result = await this.orm.query(`
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
    `, [streakType, userId, activeWithinDays !== null && activeWithinDays !== void 0 ? activeWithinDays : null]);
        return result[0] || null;
    }
    buildEmailUserQuery() {
        return this.orm.createQueryBuilder('user').select(UserRepository_1.EMAIL_USER_SELECT_FIELDS);
    }
    async getUsersForWeeklyEmailsBatch(skip = 0, take = 30, daysThreshold = 30) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
        return this.buildEmailUserQuery()
            .where('user.email_frequency IN (:...frequencies)', {
            frequencies: [user_entity_1.EmailFrequency.WEEKLY, user_entity_1.EmailFrequency.DAILY],
        })
            .andWhere('user.feature_flags ? :featureFlag', { featureFlag: constants_1.FEATURE_FLAGS.WEEKLY_EMAILS })
            .andWhere('((user.last_completed_sequence_at IS NOT NULL AND user.last_completed_sequence_at >= :threshold) OR (user.last_completed_focus_mode_at IS NOT NULL AND user.last_completed_focus_mode_at >= :threshold))', { threshold: thresholdDate })
            .orderBy('user.id', 'ASC')
            .skip(skip)
            .take(take)
            .getMany();
    }
    async getUsersForDailyEmailsBatch(skip = 0, take = 30, daysThreshold = 30) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
        return this.buildEmailUserQuery()
            .where('user.email_frequency = :frequency', { frequency: user_entity_1.EmailFrequency.DAILY })
            .andWhere('user.feature_flags ? :featureFlag', { featureFlag: constants_1.FEATURE_FLAGS.DAILY_EMAILS })
            .andWhere('((user.last_completed_sequence_at IS NOT NULL AND user.last_completed_sequence_at >= :threshold) OR (user.last_completed_focus_mode_at IS NOT NULL AND user.last_completed_focus_mode_at >= :threshold))', { threshold: thresholdDate })
            .orderBy('user.id', 'ASC')
            .skip(skip)
            .take(take)
            .getMany();
    }
    async updateEmailFrequency(userId, frequency) {
        await this.update(userId, {
            email_frequency: frequency,
            updated_at: new Date(),
        });
    }
    async getUsersForMonthlyEmailsBatch(skip = 0, take = 30, daysThreshold = 30) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
        return this.buildEmailUserQuery()
            .where('user.email_frequency IN (:...frequencies)', {
            frequencies: [user_entity_1.EmailFrequency.MONTHLY, user_entity_1.EmailFrequency.WEEKLY, user_entity_1.EmailFrequency.DAILY],
        })
            .andWhere('user.feature_flags ? :featureFlag', { featureFlag: constants_1.FEATURE_FLAGS.MONTHLY_EMAILS })
            .andWhere('((user.last_completed_sequence_at IS NOT NULL AND user.last_completed_sequence_at >= :threshold) OR (user.last_completed_focus_mode_at IS NOT NULL AND user.last_completed_focus_mode_at >= :threshold))', { threshold: thresholdDate })
            .orderBy('user.id', 'ASC')
            .skip(skip)
            .take(take)
            .getMany();
    }
    async getUsersForNoProgressEmailsBatch(skip = 0, take = 30, daysThreshold = 7) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
        return this.buildEmailUserQuery()
            .where('user.email_frequency IN (:...frequencies)', {
            frequencies: [user_entity_1.EmailFrequency.WEEKLY, user_entity_1.EmailFrequency.DAILY],
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
    removeUnwantedProperties(sequence) {
        if (sequence === null || sequence === void 0 ? void 0 : sequence.custom_routine) {
            sequence.custom_routine.user_id = undefined;
        }
        if (sequence === null || sequence === void 0 ? void 0 : sequence.custom_routine_id) {
            sequence.custom_routine_id = undefined;
        }
    }
};
exports.UserRepository = UserRepository;
UserRepository.EMAIL_USER_SELECT_FIELDS = [
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
exports.UserRepository = UserRepository = UserRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], UserRepository);
//# sourceMappingURL=user.repository.js.map