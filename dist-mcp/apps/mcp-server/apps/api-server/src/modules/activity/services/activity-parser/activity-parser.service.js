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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityParserService = void 0;
const common_1 = require("@nestjs/common");
const observability_1 = require("../../../../../../../libs/observability/src");
const bull_1 = require("@nestjs/bull");
const constants_1 = require("../../../../shared/utils/constants");
const activity_data_model_1 = require("../../domain/activity-data.model");
const activity_type_enum_1 = require("../../domain/activity-type.enum");
const activity_sequence_entity_1 = require("../../entities/activity-sequence.entity");
const activity_entity_1 = require("../../entities/activity.entity");
const activity_sequence_repository_1 = require("../../repositories/activity-sequence.repository");
const log_quantity_questions_1 = require("../../entities/log-quantity-questions");
const tutorial_entity_1 = require("../../entities/tutorial.entity");
let ActivityParserService = class ActivityParserService {
    constructor(activitySequenceRepository, sentryService, emojiGenerationQueue) {
        this.activitySequenceRepository = activitySequenceRepository;
        this.sentryService = sentryService;
        this.emojiGenerationQueue = emojiGenerationQueue;
    }
    serialize(activity_sequences, userCustomRoutines) {
        var _a;
        this.sentryService.instance().addBreadcrumb({
            category: 'Service',
            level: 'debug',
            message: 'Serializing activities (formatting activities to be sent to front end)',
        });
        const serializedActivities = {};
        for (const { type, activities, activity_ids, custom_routine_id, id: sequence_id } of activity_sequences) {
            const transformTutorial = (tutorial) => (tutorial && typeof tutorial === 'object' ? tutorial.id : tutorial);
            const mapActivity = ({ id, duration_seconds, activity_sequence_id, activity_template_id, log_quantity, log_summary_type, activity_data, choices, is_default, run_micro_breaks, days_of_week, completion_requirements, log_quantity_questions, linked_activity_id, check_list, impact_category, created_at, tutorial, cutoff_time_for_doing_activity, geofence_id, }) => {
                const currentEmoji = activity_data === null || activity_data === void 0 ? void 0 : activity_data.habit_icon;
                const needsEmojiGeneration = !currentEmoji || currentEmoji === '';
                if (needsEmojiGeneration) {
                    this.addEmojiGenerationJob(activity_data === null || activity_data === void 0 ? void 0 : activity_data.name, id);
                }
                return Object.assign(Object.assign({ id, choices: choices === null || choices === void 0 ? void 0 : choices.map(mapActivity), duration_seconds: Number(duration_seconds), activity_sequence_id,
                    activity_template_id,
                    log_quantity,
                    log_summary_type,
                    is_default,
                    run_micro_breaks,
                    days_of_week, completion_requirements: completion_requirements !== null && completion_requirements !== void 0 ? completion_requirements : undefined, log_quantity_questions,
                    linked_activity_id,
                    check_list,
                    impact_category,
                    created_at }, activity_data), { geofence_id: geofence_id !== null && geofence_id !== void 0 ? geofence_id : null, tutorial: transformTutorial(tutorial), cutoff_time_for_doing_activity, activity_type: type });
            };
            const orderedActivities = Array.from(new Set(activity_ids))
                .map((id) => activities.find((e) => e.id === id))
                .filter(Boolean)
                .map(mapActivity);
            if (type === activity_type_enum_1.ActivityType.standalone) {
                const custom_routine = userCustomRoutines === null || userCustomRoutines === void 0 ? void 0 : userCustomRoutines.find((routine) => routine.id === custom_routine_id);
                if (custom_routine) {
                    const { user_id } = custom_routine, rest = __rest(custom_routine, ["user_id"]);
                    const updateCustomRoutineDto = Object.assign(Object.assign({}, rest), { standalone_activities: orderedActivities, activity_sequence_id: sequence_id });
                    serializedActivities.custom_routines = [
                        ...((_a = serializedActivities.custom_routines) !== null && _a !== void 0 ? _a : []),
                        updateCustomRoutineDto,
                    ];
                }
                else {
                    serializedActivities.standalone_activities = orderedActivities;
                }
            }
            else {
                let key = `${type}_activities`;
                if (type === activity_type_enum_1.ActivityType.break)
                    key = 'break_activities';
                serializedActivities[key] = orderedActivities;
            }
        }
        return serializedActivities;
    }
    async deserialize(serialized, user_id, pack_id) {
        this.sentryService.instance().addBreadcrumb({
            category: 'Service',
            level: 'debug',
            message: 'Deserializing activities (formatting activities to be saved in DB)',
            data: {
                user_id,
            },
        });
        const logQuantityQuestions = this.getLogQuantityQuestions(serialized, user_id);
        const tutorials = this.getActivitiesTutorial(serialized, user_id);
        const entries = Object.entries(serialized);
        const deserializedActivities = await Promise.all(entries.map(async ([name, serializedActivities]) => {
            let [type] = name.split('_');
            if (type === 'break')
                type = activity_type_enum_1.ActivityType.break;
            const sequence = await this.createActivitySequence(serializedActivities, {
                type: type,
                user_id,
                pack_id,
            });
            const activity_sequence_id = sequence.id;
            const context = { type, user_id, activity_sequence_id };
            const activities = (await Promise.all(serializedActivities.map((activity) => this.createActivity(activity, context)))).flat();
            return { sequence, activities };
        }));
        return { deserializedActivities, logQuantityQuestions, tutorials };
    }
    getLogQuantityQuestions(serializedActivities, userId) {
        const activitySequenceArrays = Object.values(serializedActivities);
        const updateActivities = [].concat(...activitySequenceArrays);
        const activitiesAndChoices = updateActivities.flatMap((activity) => {
            var _a;
            const choices = (_a = activity === null || activity === void 0 ? void 0 : activity.choices) !== null && _a !== void 0 ? _a : [];
            return [activity, ...choices];
        });
        const questionsArrays = activitiesAndChoices.map((activity) => {
            return this.createLogQuantityQuestions(activity, userId);
        });
        const questions = questionsArrays.flatMap((array) => array);
        return questions;
    }
    createLogQuantityQuestions(activity, userId) {
        const { id, log_quantity_questions, log_quantity_question, log_summary_type, log_quantity } = activity;
        const questionStrings = log_quantity_questions === null || log_quantity_questions === void 0 ? void 0 : log_quantity_questions.map(({ question }) => question === null || question === void 0 ? void 0 : question.toLowerCase());
        if (log_quantity_question && !(questionStrings === null || questionStrings === void 0 ? void 0 : questionStrings.includes(log_quantity_question === null || log_quantity_question === void 0 ? void 0 : log_quantity_question.toLowerCase()))) {
            const questionFromOldFormat = new log_quantity_questions_1.LogQuantityQuestion({
                question: log_quantity_question,
                activity_id: id,
                user_id: userId,
                log_summary_type,
            });
            const questionsForActivity = log_quantity_questions === null || log_quantity_questions === void 0 ? void 0 : log_quantity_questions.map((question) => new log_quantity_questions_1.LogQuantityQuestion(Object.assign(Object.assign({}, question), { activity_id: id, user_id: userId })));
            const logQuantityQuestions = [...(questionsForActivity || []), questionFromOldFormat];
            return (logQuantityQuestions === null || logQuantityQuestions === void 0 ? void 0 : logQuantityQuestions.length) > 0 ? logQuantityQuestions : [];
        }
        const questionsForActivity = log_quantity_questions === null || log_quantity_questions === void 0 ? void 0 : log_quantity_questions.map((question) => new log_quantity_questions_1.LogQuantityQuestion(Object.assign(Object.assign({}, question), { activity_id: id, user_id: userId })));
        if (log_quantity && (log_quantity_questions === null || log_quantity_questions === void 0 ? void 0 : log_quantity_questions.length) < 1 && !log_quantity_question) {
            const defaultQuestion = new log_quantity_questions_1.LogQuantityQuestion({
                question: `Log quantity for ${activity.name}`,
                activity_id: id,
                user_id: userId,
                log_summary_type,
            });
            questionsForActivity.push(defaultQuestion);
        }
        return (questionsForActivity === null || questionsForActivity === void 0 ? void 0 : questionsForActivity.length) > 0 ? questionsForActivity : [];
    }
    addEmojiGenerationJob(activityName, activityId) {
        const normalizedName = this.normalizeActivityName(activityName);
        this.emojiGenerationQueue.add(constants_1.BullWorkers.GENERATE_ACTIVITY_EMOJI, {
            activity_id: activityId,
            activity_name: normalizedName,
        });
    }
    getLocalEmojiForActivity(activityName, activityId) {
        const normalizedName = this.normalizeActivityName(activityName);
        const predefinedEmoji = constants_1.ACITIVITY_EMOJI_MAP[normalizedName];
        if (predefinedEmoji)
            return predefinedEmoji;
        this.emojiGenerationQueue.add(constants_1.BullWorkers.GENERATE_ACTIVITY_EMOJI, {
            activity_id: activityId,
            activity_name: normalizedName,
        });
        return '';
    }
    normalizeActivityName(activityName) {
        return activityName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
    async createActivity(_a, _b) {
        var { id, duration_seconds, log_quantity, log_summary_type, activity_template_id, choices, is_default, run_micro_breaks, days_of_week, completion_requirements, linked_activity_id, check_list, log_quantity_question, impact_category, cutoff_time_for_doing_activity, geofence_id } = _a, rest = __rest(_a, ["id", "duration_seconds", "log_quantity", "log_summary_type", "activity_template_id", "choices", "is_default", "run_micro_breaks", "days_of_week", "completion_requirements", "linked_activity_id", "check_list", "log_quantity_question", "impact_category", "cutoff_time_for_doing_activity", "geofence_id"]);
        var type = _b.type, user_id = _b.user_id, activity_sequence_id = _b.activity_sequence_id;
        this.sentryService.instance().addBreadcrumb({
            category: 'Service',
            level: 'debug',
            message: 'Create activity',
            data: {
                activity_id: id,
            },
        });
        const has_choices = (choices === null || choices === void 0 ? void 0 : choices.length) > 0;
        const activity_data = this.createActivityData(Object.assign(Object.assign({}, rest), { id }));
        const activity = new activity_entity_1.Activity({
            id,
            activity_data,
            type,
            user_id,
            activity_sequence_id,
            duration_seconds,
            log_quantity: has_choices ? false : log_quantity,
            log_summary_type: has_choices ? 'SUM' : log_summary_type,
            has_choices,
            activity_template_id,
            is_default,
            run_micro_breaks,
            days_of_week,
            completion_requirements,
            linked_activity_id,
            check_list,
            impact_category,
            cutoff_time_for_doing_activity,
            geofence_id,
        });
        const result = [activity];
        if (has_choices)
            result.push(...this.deserializeChoices(choices, activity));
        return result;
    }
    createActivityData(activity) {
        const activityData = new activity_data_model_1.ActivityData(activity);
        activityData.habit_icon =
            activity.habit_icon && activity.habit_icon !== ''
                ? activity.habit_icon
                : this.getLocalEmojiForActivity(activity.name, activity.id);
        return activityData;
    }
    deserializeChoices(choices, parent) {
        this.sentryService.instance().addBreadcrumb({
            category: 'Service',
            level: 'debug',
            message: 'Deserializing activity choices',
            data: {
                parent_id: parent.id,
            },
        });
        return choices.map((_a) => {
            var { id, log_quantity, log_summary_type, completion_requirements, linked_activity_id, geofence_id, activity_template_id, log_quantity_question } = _a, rest = __rest(_a, ["id", "log_quantity", "log_summary_type", "completion_requirements", "linked_activity_id", "geofence_id", "activity_template_id", "log_quantity_question"]);
            return new activity_entity_1.Activity({
                id,
                activity_data: this.createActivityData(Object.assign(Object.assign({}, rest), { id })),
                parent_id: parent.id,
                type: parent.type,
                user_id: parent.user_id,
                activity_sequence_id: null,
                duration_seconds: parent.duration_seconds,
                log_quantity,
                log_summary_type,
                has_choices: null,
                is_default: parent.is_default,
                run_micro_breaks: parent.run_micro_breaks,
                days_of_week: parent.days_of_week,
                completion_requirements,
                linked_activity_id,
                activity_template_id,
                geofence_id,
            });
        });
    }
    async createActivitySequence(serializedActivities, { type, user_id, pack_id, custom_routine_id, }) {
        this.sentryService.instance().addBreadcrumb({
            category: 'Service',
            level: 'debug',
            message: 'Create activity sequence',
            data: {
                user_id,
                type,
            },
        });
        const activity_ids = serializedActivities.map(({ id }) => id);
        const total_duration_seconds = this.calculateSequenceDuration(serializedActivities);
        let sequenceItem;
        if (custom_routine_id) {
            sequenceItem = await this.activitySequenceRepository.findOneByTypeAndCustomRoutineForUser(type, user_id, custom_routine_id);
        }
        else if (type !== activity_type_enum_1.ActivityType.standalone) {
            sequenceItem = await this.activitySequenceRepository.findOneByTypeForUser(type, user_id);
        }
        const sequence = new activity_sequence_entity_1.ActivitySequence({ type, activity_ids, user_id, total_duration_seconds, id: sequenceItem === null || sequenceItem === void 0 ? void 0 : sequenceItem.id, pack_id, custom_routine_id }, { generateId: !(sequenceItem === null || sequenceItem === void 0 ? void 0 : sequenceItem.id) });
        return sequence;
    }
    calculateSequenceDuration(activities) {
        this.sentryService.instance().addBreadcrumb({
            category: 'Service',
            level: 'debug',
            message: 'Calculating sequence duration',
        });
        const durations = activities.map(({ duration_seconds }) => Number(duration_seconds));
        const addUp = (accumulator, item) => accumulator + item;
        const initialAccumulator = 0;
        const sequenceDuration = durations.reduce(addUp, initialAccumulator);
        return sequenceDuration;
    }
    getActivitiesTutorial(serializedActivities, user_id) {
        const activities = Object.values(serializedActivities).flat();
        return activities.reduce((tutorials, activity) => {
            if (activity === null || activity === void 0 ? void 0 : activity.tutorial) {
                tutorials.push(new tutorial_entity_1.Tutorial({ id: activity.tutorial, activity_id: activity.id, user_id }));
            }
            return tutorials;
        }, []);
    }
    async deserializeCustomRoutineActivities(customRoutines, user_id) {
        return Promise.all(customRoutines.map(async (routine) => {
            var _a;
            const type = activity_type_enum_1.ActivityType.standalone;
            const routine_activities = ((_a = routine === null || routine === void 0 ? void 0 : routine.standalone_activities) !== null && _a !== void 0 ? _a : []);
            const sequence = await this.createActivitySequence(routine_activities, {
                type,
                user_id,
                custom_routine_id: routine.id,
            });
            const activity_sequence_id = sequence.id;
            const context = { type, user_id, activity_sequence_id, custom_routine_id: routine.id };
            const activities = (await Promise.all(routine_activities.map((activity) => this.createActivity(activity, context)))).flat();
            return { sequence, activities };
        }));
    }
};
exports.ActivityParserService = ActivityParserService;
exports.ActivityParserService = ActivityParserService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, observability_1.InjectSentry)()),
    __param(2, (0, bull_1.InjectQueue)(constants_1.BullQueues.EMOJI_GENERATION)),
    __metadata("design:paramtypes", [activity_sequence_repository_1.ActivitySequenceRepository,
        observability_1.SentryService, Object])
], ActivityParserService);
//# sourceMappingURL=activity-parser.service.js.map