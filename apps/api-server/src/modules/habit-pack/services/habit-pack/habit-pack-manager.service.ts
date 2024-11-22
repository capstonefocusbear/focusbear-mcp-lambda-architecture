import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as _ from 'lodash';
import { In } from 'typeorm';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { UpdateActivityTemplateDto } from '../../../activity-template/dto/activity-template.dto';
import { ActivityTemplateRepository } from '../../../activity-template/repository/activity-template.repository';
import { UpdateActivityDto } from '../../../activity/dto/update-activity.dto';
import { UserSettingsService } from '../../../user/services/user-settings/user-settings.service';
import { UpsertHabitPackDto } from '../../dto/upsert-habit-pack.dto';
import { HabitPackService } from './habit-pack.service';
import { InstalledPackService } from '../installed-packs/installed-pack.service';
import { ResponseMessage } from '../../../../shared/domain/response-message.model';
import { InstalledPackRepository } from '../../repositories/installed-pack.repository';
import {
  ActivityParserService,
  SerializedActivity,
} from '../../../activity/services/activity-parser/activity-parser.service';
import { HabitPackRepository } from '../../repositories/habit-pack.repository';
import { ActivitySequenceRepository } from '../../../activity/repositories/activity-sequence.repository';
import { HabitPackType } from '../../domain/habit-pack-type.enum';
import { UserRepository } from '../../../user/repositories/user.repository';
import { HabitPack } from '../../entity/habit-pack.entity';
import { UserSettingsResponseDto } from '../../../user/dto/user-settings-response.dto';
import { ActivityType } from '../../../activity/domain/activity-type.enum';
import { InstalledStandalonePackResponse } from '../../domain/installed-standalone-pack-response.model';
import { LogQuantityQuestion } from '../../../activity/entities/log-quantity-questions';
import { UpdateUserSettingsDto } from '../../../user/dto/update-user-settings.dto';
import { ConvertedTemplatesNewIdsMaps } from '../../domain/converted-templates-new-ids-maps.model';

@Injectable()
export class HabitPackManagerService {
  constructor(
    private readonly habitPackService: HabitPackService,
    private readonly userSettingsService: UserSettingsService,
    private readonly installedPackService: InstalledPackService,
    private readonly activityTemplateRepository: ActivityTemplateRepository,
    private readonly installedPackRepository: InstalledPackRepository,
    private readonly activityParserService: ActivityParserService,
    private readonly habitPackRepository: HabitPackRepository,
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    private readonly userRepository: UserRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async installHabitPack(user_id: string, pack_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Trying to install habit pack',
        data: {
          user_id,
          pack_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      const pack = await this.habitPackRepository.orm.findOneBy({ id: pack_id });
      if (!pack) throw new NotFoundException(`Habit pack with ID: ${pack_id} does not exist!`);
      const { pack_type } = pack;
      const installedPack = await this.installedPackRepository.orm.findOne({
        where: { user_id, pack_id, installation_status: true },
      });
      if (installedPack) {
        throw new BadRequestException({
          message: `User with ID: ${user_id} already has habit pack with ID: ${pack_id} installed!`,
          donotloginslack: true,
        });
      }
      if (pack_type === HabitPackType.routine) {
        const response = await this.installRoutineHabitPack(user_id, pack_id);
        return response;
      }
      if (pack_type === HabitPackType.standalone) {
        const response = await this.installStandaloneHabitPack(user_id, pack_id);
        return response;
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async installRoutineHabitPack(user_id: string, pack_id: string): Promise<ResponseMessage> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Installing routine habit pack',
      data: {
        user_id,
        pack_id,
      },
    });
    const userSettings = await this.userSettingsService.getSettings({ user_id });
    const habitPack: UpsertHabitPackDto = await this.habitPackService.getHabitPack(pack_id);
    const templatesNewIdsMap = new Map<string, string>([]);
    const templatesChoicesNewIdsMap = new Map<string, string>([]);
    const logQuantityQuestionsNewIdsMap = new Map<string, string>([]);
    //log current user seeting
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'User settings before installing habit pack',
      data: {
        'Morning activities length': userSettings?.morning_activities?.length || 0,
        'Evening activities length': userSettings?.evening_activities?.length || 0,
        'Break activities length': userSettings?.break_activities?.length || 0,
      },
    });
    // convert templates to normal activities and merge them with user's current settings
    const newSettings = this.addTemplatesToUserSettings(userSettings, habitPack, {
      templatesNewIdsMap,
      templatesChoicesNewIdsMap,
      logQuantityQuestionsNewIdsMap,
    });

    //log new user setting
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'User settings after installing habit pack',
      data: {
        'Morning activities length': newSettings?.morning_activities?.length || 0,
        'Evening activities length': newSettings?.evening_activities?.length || 0,
        'Break activities length': newSettings?.break_activities?.length || 0,
      },
    });

    // link converted activities and questions to their canonical versions
    const linkedSettings = this.linkInstalledActivitiesAndLogQuestions(newSettings, {
      templatesNewIdsMap,
      templatesChoicesNewIdsMap,
      logQuantityQuestionsNewIdsMap,
    });
    const morning_activities = (linkedSettings?.morning_activities ?? []).map(
      ({ cutoff_time_for_doing_activity, ...rest }) => rest,
    );
    const break_activities = (linkedSettings?.break_activities ?? []).map(
      ({ tutorial, cutoff_time_for_doing_activity, ...rest }) => rest,
    );
    await this.installedPackService.setPackAsInstalledForUser(user_id, pack_id);
    await this.userSettingsService.updateSettings(
      { user_id },
      { ...linkedSettings, break_activities, morning_activities },
      false,
      {
        is_onboarding: true,
      },
    );
    return new ResponseMessage(`Habit pack with ID: ${pack_id} successfully installed for user with ID: ${user_id}!`);
  }

  addTemplatesToUserSettings(
    userSettings: UpdateUserSettingsDto,
    habitPack: UpsertHabitPackDto,
    { templatesNewIdsMap, templatesChoicesNewIdsMap, logQuantityQuestionsNewIdsMap }: ConvertedTemplatesNewIdsMaps,
  ) {
    const newSettings = _.cloneDeep(userSettings);
    newSettings.morning_activities = this.formatAndMergeTemplatesWithActivities(
      userSettings?.morning_activities ?? [],
      habitPack.morning_activities,
      { templatesNewIdsMap, templatesChoicesNewIdsMap, logQuantityQuestionsNewIdsMap },
    );
    newSettings.break_activities = this.formatAndMergeTemplatesWithActivities(
      userSettings?.break_activities ?? [],
      habitPack.break_activities,
      { templatesNewIdsMap, templatesChoicesNewIdsMap, logQuantityQuestionsNewIdsMap },
    );
    newSettings.evening_activities = this.formatAndMergeTemplatesWithActivities(
      userSettings?.evening_activities ?? [],
      habitPack.evening_activities,
      { templatesNewIdsMap, templatesChoicesNewIdsMap, logQuantityQuestionsNewIdsMap },
    );
    return newSettings;
  }

  linkInstalledActivitiesAndLogQuestions(
    userSettings: UpdateUserSettingsDto,
    { templatesNewIdsMap, templatesChoicesNewIdsMap, logQuantityQuestionsNewIdsMap }: ConvertedTemplatesNewIdsMaps,
  ) {
    const linkedSettings = _.cloneDeep(userSettings);
    linkedSettings.morning_activities = this.linkNewlyCreatedActivities(linkedSettings.morning_activities, {
      templatesNewIdsMap,
      templatesChoicesNewIdsMap,
      logQuantityQuestionsNewIdsMap,
    });
    linkedSettings.break_activities = this.linkNewlyCreatedActivities(linkedSettings.break_activities, {
      templatesNewIdsMap,
      templatesChoicesNewIdsMap,
      logQuantityQuestionsNewIdsMap,
    });
    linkedSettings.evening_activities = this.linkNewlyCreatedActivities(linkedSettings.evening_activities, {
      templatesNewIdsMap,
      templatesChoicesNewIdsMap,
      logQuantityQuestionsNewIdsMap,
    });
    return linkedSettings;
  }

  formatAndMergeTemplatesWithActivities = (
    activities: UpdateActivityDto[],
    templates: UpdateActivityTemplateDto[],
    { templatesNewIdsMap, templatesChoicesNewIdsMap, logQuantityQuestionsNewIdsMap }: ConvertedTemplatesNewIdsMaps,
  ) => {
    return [
      ...activities,
      ...this.convertActivityTemplatesToUpdateActivityDtos(templates, {
        templatesNewIdsMap,
        templatesChoicesNewIdsMap,
        logQuantityQuestionsNewIdsMap,
      }),
    ];
  };

  async installStandaloneHabitPack(user_id: string, pack_id: string): Promise<ResponseMessage> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Installing standalone habit pack',
      data: {
        user_id,
        pack_id,
      },
    });
    const templatesNewIdsMap = new Map<string, string>([]);
    const templatesChoicesNewIdsMap = new Map<string, string>([]);
    const logQuantityQuestionsNewIdsMap = new Map<string, string>([]);
    const habitPack: UpsertHabitPackDto = await this.habitPackService.getHabitPack(pack_id);
    const { standalone_activities } = habitPack;
    const newActivities = this.convertActivityTemplatesToUpdateActivityDtos(standalone_activities, {
      templatesNewIdsMap,
      templatesChoicesNewIdsMap,
      logQuantityQuestionsNewIdsMap,
    });
    const serializedActivities: SerializedActivity = { standalone_activities: newActivities };
    const deserializedActivities = await this.activityParserService.deserialize(serializedActivities, user_id, pack_id);
    await this.habitPackRepository.consistentlyInstallStandaloneHabitPack(deserializedActivities[0]);
    await this.installedPackService.setPackAsInstalledForUser(user_id, pack_id, deserializedActivities[0].sequence.id);
    return new ResponseMessage(`Habit pack with ID: ${pack_id} successfully installed for user with ID: ${user_id}!`);
  }

  convertActivityTemplatesToUpdateActivityDtos(
    activityTemplatesOfType: UpdateActivityTemplateDto[],
    { templatesNewIdsMap, templatesChoicesNewIdsMap, logQuantityQuestionsNewIdsMap }: ConvertedTemplatesNewIdsMaps,
  ): UpdateActivityDto[] {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Converting activity templates to normal activities',
    });
    const activities: UpdateActivityDto[] = [];
    activityTemplatesOfType.map(
      ({ id: templateId, choices, log_quantity_questions, tutorial, ...restOfTemplateData }) => {
        // convert template choices to normal choices
        const convertedChoices = choices.map(
          ({ id, log_quantity_questions: choiceLogQuantityQuestions, ...restOfChoiceData }) => {
            const choiceNewId = randomUUID();
            templatesChoicesNewIdsMap.set(id, choiceNewId);
            // convert template choices' log quantity questions to normal questions
            const convertedChoiceLogQuantityQuestions = choiceLogQuantityQuestions?.map(
              ({ id: choiceQuestionId, ...restOfQuestionData }) => {
                const newChoiceQuestionId = randomUUID();
                logQuantityQuestionsNewIdsMap.set(choiceQuestionId, newChoiceQuestionId);
                return { id: newChoiceQuestionId, ...restOfQuestionData };
              },
            );
            return {
              id: choiceNewId,
              activity_template_id: id,
              log_quantity_questions: convertedChoiceLogQuantityQuestions,
              ...restOfChoiceData,
            };
          },
        );
        // convert activity's log quantity questions to new questions for installable activity
        const convertedLogQuantityQuestions = log_quantity_questions?.map(
          ({ id: questionId, ...restOfQuestionData }) => {
            const newQuestionId = randomUUID();
            logQuantityQuestionsNewIdsMap.set(questionId, newQuestionId);
            return { id: newQuestionId, ...restOfQuestionData };
          },
        );

        // create installable activity from activity template
        const activityNewId = randomUUID();
        const activityCreatedFromTemplate: UpdateActivityDto = {
          id: activityNewId,
          activity_template_id: templateId,
          choices: convertedChoices,
          log_quantity_questions: convertedLogQuantityQuestions,
          tutorial: tutorial ?? undefined,
          ...restOfTemplateData,
        };
        templatesNewIdsMap.set(templateId, activityNewId);
        return activities.push(activityCreatedFromTemplate);
      },
    );
    return activities;
  }

  linkNewlyCreatedActivities(
    updateActivities: UpdateActivityDto[],
    { templatesNewIdsMap, templatesChoicesNewIdsMap, logQuantityQuestionsNewIdsMap }: ConvertedTemplatesNewIdsMaps,
  ): UpdateActivityDto[] {
    const linkedActivities = updateActivities.map((activity) => {
      const updatedActivity = { ...activity };
      let updatedActivityLogQuantityQuestions = updatedActivity?.log_quantity_questions ?? [];
      // check if activity is from template and linked to a canonical activity
      if (activity?.activity_template_id && activity?.linked_activity_template_id) {
        // get canonical activity new ID
        const linkedActivityId = templatesNewIdsMap.get(activity.linked_activity_template_id); // see docs/linked-activity-template-id.md
        // connect activity to canonical activity
        updatedActivity.linked_activity_id = linkedActivityId;
        // assign log question from template a new linked question id to link with question created from template
        if (activity?.log_quantity_questions?.length > 0) {
          updatedActivityLogQuantityQuestions = updatedActivityLogQuantityQuestions.map((question) => {
            const updatedQuestion = { ...question };
            // check if question is linked to a canonical question
            if (question.linked_question_id) {
              // get canonical question new ID
              const newLinkedQuestionId = logQuantityQuestionsNewIdsMap.get(question.linked_question_id);
              // connect question to canonical question
              updatedQuestion.linked_question_id = newLinkedQuestionId;
            }
            return updatedQuestion;
          });
        }
      }
      // remove redundant property from activity
      delete updatedActivity?.linked_activity_template_id;
      // return activity, choices, and questions that are now linked to possible canonical versions
      return {
        ...updatedActivity,
        choices: this.linkNewlyCreatedChoices(activity, { templatesChoicesNewIdsMap, logQuantityQuestionsNewIdsMap }),
        log_quantity_questions: updatedActivityLogQuantityQuestions,
      };
    });
    return linkedActivities;
  }

  linkNewlyCreatedChoices(
    activity: UpdateActivityDto,
    { templatesChoicesNewIdsMap, logQuantityQuestionsNewIdsMap }: ConvertedTemplatesNewIdsMaps,
  ) {
    // link choices to the newly created choices they were linked to as templates
    return activity?.choices?.map((choice) => {
      const updatedChoice = { ...choice };
      let updatedChoiceLogQuantityQuestions: LogQuantityQuestion[] = [];
      // check if choice is linked to another choice
      if (updatedChoice?.linked_activity_template_id) {
        // get ID of canonical choice
        const linkedChoiceId = templatesChoicesNewIdsMap.get(updatedChoice.linked_activity_template_id);
        // connect this choice to its canonical choice
        updatedChoice.linked_activity_id = linkedChoiceId;
        if (updatedChoice?.log_quantity_questions?.length > 0) {
          updatedChoiceLogQuantityQuestions = updatedChoice.log_quantity_questions.map((question) => {
            const updatedQuestion = { ...question };
            // check if question is linked to a canonical question
            if (updatedQuestion?.linked_question_id) {
              // get canonical question new ID
              const newLinkedQuestionId = logQuantityQuestionsNewIdsMap.get(updatedQuestion.linked_question_id);
              // connect question to canonical question
              updatedQuestion.linked_question_id = newLinkedQuestionId;
            }
            return updatedQuestion;
          });
        }
      }
      // remove redundant property from choice
      delete updatedChoice.linked_activity_template_id;
      return { ...updatedChoice, log_quantity_questions: updatedChoiceLogQuantityQuestions };
    });
  }

  async uninstallHabitPack(user_id: string, pack_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Trying to uninstall habit pack',
        data: {
          user_id,
          pack_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      const pack = await this.habitPackRepository.orm.findOneBy({ id: pack_id });
      if (!pack) {
        throw new NotFoundException(`Habit pack with ID: ${pack_id} does not exist!`);
      }
      const { pack_type } = pack;
      const installedPack = await this.installedPackRepository.orm.findOne({
        where: { user_id, pack_id, installation_status: true },
      });
      if (!installedPack) {
        throw new BadRequestException(`User with ID: ${user_id} doesn't have pack with ID: ${pack_id} installed!`);
      }

      if (pack_type === HabitPackType.routine) {
        const response = await this.uninstallRoutineHabitPack(user_id, pack_id);
        return response;
      }
      if (pack_type === HabitPackType.standalone) {
        const response = await this.uninstallStandaloneHabitPack(user_id, pack_id);
        return response;
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async uninstallRoutineHabitPack(user_id: string, pack_id: string): Promise<ResponseMessage> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Uninstalling routine habit pack',
      data: {
        user_id,
        pack_id,
      },
    });
    const activityTemplateIds = await this.activityTemplateRepository.getActivityTemplateIds(pack_id);
    const userSettings = await this.userSettingsService.getSettings({ user_id });
    const { morning_activities, break_activities, evening_activities } = userSettings;
    const activityTemplateIdsToRemove = (activityArray: UpdateActivityDto[], idArray: string[]) => {
      return activityArray.filter(({ activity_template_id }) => !idArray.includes(activity_template_id));
    };
    const newSettings = _.cloneDeep(userSettings);
    newSettings.morning_activities = activityTemplateIdsToRemove(morning_activities, activityTemplateIds)?.map(
      ({ cutoff_time_for_doing_activity, ...rest }) => ({ ...rest }),
    );
    newSettings.break_activities = activityTemplateIdsToRemove(break_activities, activityTemplateIds)?.map(
      ({ tutorial, cutoff_time_for_doing_activity, ...rest }) => ({ ...rest }),
    );
    newSettings.evening_activities = activityTemplateIdsToRemove(evening_activities, activityTemplateIds);
    await this.userSettingsService.updateSettings({ user_id }, newSettings, false, { is_onboarding: false });
    await this.installedPackService.setPackAsUninstalledForUser(user_id, pack_id);
    return new ResponseMessage(`Habit pack with ID: ${pack_id} successfully uninstalled for user with ID: ${user_id}!`);
  }

  async uninstallStandaloneHabitPack(user_id: string, pack_id: string): Promise<ResponseMessage> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Uninstalling standalone habit pack',
      data: {
        user_id,
        pack_id,
      },
    });
    const installedRecord = await this.installedPackRepository.orm.findOne({ where: { user_id, pack_id } });
    const { activity_sequence_id } = installedRecord;
    await this.activitySequenceRepository.orm.delete(activity_sequence_id);
    await this.installedPackService.setPackAsUninstalledForUser(user_id, pack_id);
    return new ResponseMessage(`Habit pack with ID: ${pack_id} successfully uninstalled for user with ID: ${user_id}!`);
  }

  async installPackAsDefaultSettings(user_id: string, pack_id: string): Promise<UserSettingsResponseDto> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Installing habit pack as default settings',
        data: {
          user_id,
          pack_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      const pack = await this.habitPackRepository.orm.findOneBy({ id: pack_id });
      if (!pack) throw new NotFoundException(`Habit pack with ID: ${pack_id} does not exist!`);
      const installedPack = await this.installedPackRepository.orm.findOne({
        where: { user_id, pack_id, installation_status: true },
      });
      if (installedPack) {
        throw new BadRequestException({
          message: `User with ID: ${user_id} already has habit pack with ID: ${pack_id} installed!`,
          donotloginslack: true,
        });
      }
      await this.userSettingsService.clearUserActivities(user_id);
      await this.installHabitPack(user_id, pack_id);
      const updatedSettings = await this.userSettingsService.getSettings({ user_id });
      return updatedSettings;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUserInstalledPacks(user_id: string): Promise<HabitPack[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting user installed packs',
        data: {
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      const installedPackIds = await this.installedPackRepository.fetchUserInstalledPackIds(user_id);
      const deserializedInstalledPacks = await this.habitPackRepository.orm.find({
        where: { id: In(installedPackIds) },
        relations: ['activity_templates', 'activity_templates.choices'],
      });
      const serializedInstalledPacks = deserializedInstalledPacks.map((habitPack) => {
        return this.habitPackService.serializeHabitPack(habitPack);
      });
      return serializedInstalledPacks;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUserInstalledStandalonePacks(user_id: string): Promise<InstalledStandalonePackResponse[]> {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
    const sequences = await this.activitySequenceRepository.orm.find({
      where: { user_id, type: ActivityType.standalone },
      relations: ['activities', 'activities.choices'],
    });
    return sequences.map((sequence) => {
      const serializedStandaloneActivities = this.activityParserService.serialize([sequence]).standalone_activities;
      return {
        id: sequence.id,
        pack_name: sequence.habit_pack.pack_name,
        pack_id: sequence.pack_id,
        standalone_activities: serializedStandaloneActivities,
      };
    });
  }
}
