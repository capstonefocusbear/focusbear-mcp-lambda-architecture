import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { In } from 'typeorm';
import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';
import { UserRepository } from '../../user/repositories/user.repository';
import { UpdateActivityTemplateDto } from '../dto/activity-template.dto';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';
import { ActivityTemplateParserService } from './activity-template-parser.service';
import { ActivityRepository } from '../../activity/repositories/activity.repository';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { GetRoutineSuggestionsDto } from '../dto/get-routine-suggestions.dto';
import { ActivityTemplate } from '../entity/activity-template.entity';

@Injectable()
export class ActivityLibraryService {
  constructor(
    private readonly activityTemplateRepository: ActivityTemplateRepository,
    private readonly activityTemplateParserService: ActivityTemplateParserService,
    private readonly activityRepository: ActivityRepository,
    private readonly userRepository: UserRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async getLibraryActivities(user_id: string): Promise<UpdateActivityDto[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching user library activities',
        data: { user_id },
      });
      await this.validateUser(user_id);
      const libraryActivitiesPromise = this.activityTemplateRepository.orm.find({
        where: { user_id, activity_type: 'library' },
        relations: ['choices', 'choices.log_quantity_questions', 'log_quantity_questions', 'activity_template_tag'],
      });
      const userActivitiesPromise = this.activityRepository.orm.find({
        where: { user_id },
        relations: ['choices', 'choices.log_quantity_questions', 'log_quantity_questions'],
      });
      const [libraryActivities, userActivities] = await Promise.all([libraryActivitiesPromise, userActivitiesPromise]);
      return this.activityTemplateParserService.serializeLibraryActivities([...libraryActivities, ...userActivities]);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async upsertLibraryActivities(updateActivities: UpdateActivityTemplateDto[], user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user library activities',
        data: { user_id },
      });
      await this.validateUser(user_id);
      const activitiesToUpsert = await this.removeActivitiesNotBelongingToUser(updateActivities, user_id);
      const { deserializedActivityTemplates, logQuantityQuestions, templateTags } =
        this.activityTemplateParserService.deserializeLibraryActivities(activitiesToUpsert, user_id);
      const activityIds = deserializedActivityTemplates.map((activityTemplate) => activityTemplate.id);
      await this.activityTemplateRepository.consistentlyUpdateLibraryActivities(
        activityIds,
        deserializedActivityTemplates,
        user_id,
        logQuantityQuestions,
        templateTags,
      );
      return await this.getLibraryActivities(user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async removeActivitiesNotBelongingToUser(updateActivities: UpdateActivityTemplateDto[], user_id: string) {
    const templateActivitiesOnly = updateActivities.filter(
      (activity) => activity.activity_type === ActivityType.library,
    );
    const incomingActivityIds = templateActivitiesOnly.map((activity) => activity.id);
    const existingActivities = await this.activityTemplateRepository.orm.find({
      where: { id: In(incomingActivityIds) },
    });
    const activitiesNotBelongingToUser = existingActivities
      .filter((activity) => activity.user_id !== user_id)
      .map((activity) => activity.id);
    return templateActivitiesOnly.filter(({ id }) => !activitiesNotBelongingToUser.includes(id));
  }

  async getActivitiesRelatedToUserGoals(getRoutineSuggestionsDto: GetRoutineSuggestionsDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'get activities related to user goals',
        data: { ...getRoutineSuggestionsDto, user_id },
      });

      await this.validateUser(user_id);

      const activityTemplates = await this.activityTemplateRepository.getActivityTemplatesWithGoalsMatched(
        getRoutineSuggestionsDto,
      );
      const updateActivityTemplates = activityTemplates.sort(
        (activityTemplateA, activityTemplateB) =>
          activityTemplateA.duration_seconds - activityTemplateB.duration_seconds,
      );
      return this.formatTemplates(updateActivityTemplates, getRoutineSuggestionsDto.routine_duration * 60);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  formatTemplates(activityTemplates: ActivityTemplate[], incoming_routine_duration: number) {
    const MAX_NUMBER_OF_ROUTINE_HABITS = 5;
    const morning_routine = [];
    const evening_routine = [];
    let routine_duration = {
      morning_routine: 0,
      evening_routine: 0,
    }; //@Description: unit of duration is seconds

    activityTemplates?.some((activityTemplate) => {
      if (
        (routine_duration.morning_routine >= incoming_routine_duration &&
          routine_duration.evening_routine >= incoming_routine_duration) ||
        (morning_routine.length >= MAX_NUMBER_OF_ROUTINE_HABITS &&
          evening_routine.length >= MAX_NUMBER_OF_ROUTINE_HABITS)
      ) {
        return true;
      } else {
        if (activityTemplate.activity_type === ActivityType.morning) {
          if (routine_duration.morning_routine < incoming_routine_duration) {
            morning_routine.push(activityTemplate);
            routine_duration.morning_routine += activityTemplate.duration_seconds;
          }
        } else {
          if (routine_duration.evening_routine < incoming_routine_duration) {
            evening_routine.push(activityTemplate);
            routine_duration.evening_routine += activityTemplate.duration_seconds;
          }
        }
        return false;
      }
    });
    return [...morning_routine, ...evening_routine];
  }

  async validateUser(user_id: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
    return user;
  }
}
