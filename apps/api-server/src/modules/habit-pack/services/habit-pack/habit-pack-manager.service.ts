import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as _ from 'lodash';
import { UpdateActivityTemplateDto } from '../../../activity-template/dto/activity-template.dto';
import { ActivityTemplateRepository } from '../../../activity-template/repository/activity-template.repository';
import { UpdateActivityDto } from '../../../activity/dto/update-activity.dto';
import { UserSettingsService } from '../../../user/services/user-settings/user-settings.service';
import { CreateHabitPackDto } from '../../dto/create-habit-pack-param.dto';
import { HabitPackService } from './habit-pack.service';
import { InstalledPackService } from '../installed-packs/installed-pack.service';
import { ResponseMessage } from '../../../../shared/domain/response-message.model';
import { InstalledPackRepository } from '../../repositories/installed-pack.repository';

@Injectable()
export class HabitPackManagerService {
  constructor(
    private readonly habitPackService: HabitPackService,
    private readonly userSettingsService: UserSettingsService,
    private readonly installedPackService: InstalledPackService,
    private readonly activityTemplateRepository: ActivityTemplateRepository,
    private readonly installedPackRepository: InstalledPackRepository,
  ) {}

  async installHabitPack(user_id: string, pack_id: string): Promise<ResponseMessage> {
    await this.habitPackService.checkIfPackExists(pack_id);
    await this.habitPackService.checkForValidUser(user_id);
    const installedPack = await this.installedPackRepository.orm.findOne({
      where: { user_id, pack_id, installation_status: true },
    });
    if (installedPack) {
      throw new BadRequestException(`User with ID: ${user_id} already has habit pack with ID: ${pack_id} installed!`);
    }
    const userSettings = await this.userSettingsService.getSettings({ user_id });
    const newSettings = _.cloneDeep(userSettings);
    const habitPack: CreateHabitPackDto = await this.habitPackService.getHabitPack(pack_id);
    const formatAndMergeTemplatesWithActivities = (
      activities: UpdateActivityDto[],
      templates: UpdateActivityTemplateDto[],
    ) => {
      return [...activities, ...this.convertActivityTemplatesToUpdateActivityDtos(templates)];
    };
    newSettings.morning_activities = formatAndMergeTemplatesWithActivities(
      userSettings.morning_activities,
      habitPack.morning_activities,
    );
    newSettings.break_activities = formatAndMergeTemplatesWithActivities(
      userSettings.break_activities,
      habitPack.break_activities,
    );
    newSettings.evening_activities = formatAndMergeTemplatesWithActivities(
      userSettings.evening_activities,
      habitPack.evening_activities,
    );
    await this.installedPackService.setPackAsInstalledForUser(user_id, pack_id);
    await this.userSettingsService.updateSettings({ user_id }, newSettings);
    return new ResponseMessage(
      `Habit pack with ID: ${pack_id} was successfully installed for user with ID: ${user_id}!`,
    );
  }

  convertActivityTemplatesToUpdateActivityDtos(
    activityTemplatesOfType: UpdateActivityTemplateDto[],
  ): UpdateActivityDto[] {
    const activities: UpdateActivityDto[] = [];
    activityTemplatesOfType.map(
      ({
        name,
        id: activityId,
        include_in_every_break,
        is_office_friendly,
        video_urls,
        duration_seconds,
        log_quantity,
        log_summary_type,
        log_quantity_question,
        choices,
        choice_type,
      }) => {
        const formattedChoices = choices.map(({ id, ...restOfChoiceData }) => {
          return { id: randomUUID(), ...restOfChoiceData };
        });
        const activity: UpdateActivityDto = {
          id: randomUUID(),
          name,
          activity_template_id: activityId,
          duration_seconds,
          log_quantity,
          log_quantity_question,
          log_summary_type,
          video_urls,
          is_office_friendly,
          choice_type,
          include_in_every_break,
          choices: formattedChoices,
        };
        return activities.push(activity);
      },
    );
    return activities;
  }

  async uninstallHabitPack(user_id: string, pack_id: string): Promise<ResponseMessage> {
    await this.habitPackService.checkIfPackExists(pack_id);
    await this.habitPackService.checkForValidUser(user_id);
    const installedPack = await this.installedPackRepository.orm.findOne({
      where: { user_id, pack_id, installation_status: true },
    });
    if (!installedPack) {
      throw new BadRequestException(`User with ID: ${user_id} does not have habit pack with ID: ${pack_id} installed!`);
    }
    const activityTemplateIds = await this.activityTemplateRepository.getActivityTemplateIds(pack_id);
    const userSettings = await this.userSettingsService.getSettings({ user_id });
    const { morning_activities, break_activities, evening_activities } = userSettings;
    const activityTemplateIdsToRemove = (activityArray: UpdateActivityDto[], idArray: string[]) => {
      return activityArray.filter(({ activity_template_id }) => !idArray.includes(activity_template_id));
    };
    const newSettings = _.cloneDeep(userSettings);
    newSettings.morning_activities = activityTemplateIdsToRemove(morning_activities, activityTemplateIds);
    newSettings.break_activities = activityTemplateIdsToRemove(break_activities, activityTemplateIds);
    newSettings.evening_activities = activityTemplateIdsToRemove(evening_activities, activityTemplateIds);
    await this.userSettingsService.updateSettings({ user_id }, newSettings);
    await this.installedPackService.setPackAsUninstalledForUser(user_id, pack_id);
    return new ResponseMessage(
      `Habit pack with ID: ${pack_id} was successfully uninstalled for user with ID: ${user_id}!`,
    );
  }
}
