import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as _ from 'lodash';
import { In } from 'typeorm';
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
  ) {}

  async installHabitPack(user_id: string, pack_id: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
    const pack = await this.habitPackRepository.orm.findOneBy({ id: pack_id });
    if (!pack) throw new NotFoundException(`Habit pack with ID: ${pack_id} does not exist!`);
    const { pack_type } = pack;
    const installedPack = await this.installedPackRepository.orm.findOne({
      where: { user_id, pack_id, installation_status: true },
    });
    if (installedPack) {
      throw new BadRequestException(`User with ID: ${user_id} already has habit pack with ID: ${pack_id} installed!`);
    }
    if (pack_type === HabitPackType.routine) {
      const response = await this.installRoutineHabitPack(user_id, pack_id);
      return response;
    }
    if (pack_type === HabitPackType.standalone) {
      const response = await this.installStandaloneHabitPack(user_id, pack_id);
      return response;
    }
  }

  async installRoutineHabitPack(user_id: string, pack_id: string): Promise<ResponseMessage> {
    const userSettings = await this.userSettingsService.getSettings({ user_id });
    const newSettings = _.cloneDeep(userSettings);
    const habitPack: UpsertHabitPackDto = await this.habitPackService.getHabitPack(pack_id);
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
    await this.userSettingsService.updateSettings({ user_id }, newSettings, false);
    return new ResponseMessage(`Habit pack with ID: ${pack_id} successfully installed for user with ID: ${user_id}!`);
  }

  async installStandaloneHabitPack(user_id: string, pack_id: string): Promise<ResponseMessage> {
    const habitPack: UpsertHabitPackDto = await this.habitPackService.getHabitPack(pack_id);
    const { standalone_activities } = habitPack;
    const newActivities = this.convertActivityTemplatesToUpdateActivityDtos(standalone_activities);
    const serializedActivities: SerializedActivity = { standalone_activities: newActivities };
    const deserializedActivities = await this.activityParserService.deserialize(serializedActivities, user_id);
    await this.habitPackRepository.consistentlyInstallStandaloneHabitPack(deserializedActivities[0]);
    await this.installedPackService.setPackAsInstalledForUser(user_id, pack_id, deserializedActivities[0].sequence.id);
    return new ResponseMessage(`Habit pack with ID: ${pack_id} successfully installed for user with ID: ${user_id}!`);
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

  async uninstallHabitPack(user_id: string, pack_id: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
    const pack = await this.habitPackRepository.orm.findOneBy({ id: pack_id });
    if (!pack) throw new NotFoundException(`Habit pack with ID: ${pack_id} does not exist!`);
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
  }

  async uninstallRoutineHabitPack(user_id: string, pack_id: string): Promise<ResponseMessage> {
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
    await this.userSettingsService.updateSettings({ user_id }, newSettings, false);
    await this.installedPackService.setPackAsUninstalledForUser(user_id, pack_id);
    return new ResponseMessage(`Habit pack with ID: ${pack_id} successfully uninstalled for user with ID: ${user_id}!`);
  }

  async uninstallStandaloneHabitPack(user_id: string, pack_id: string): Promise<ResponseMessage> {
    const installedRecord = await this.installedPackRepository.orm.findOne({ where: { user_id, pack_id } });
    const { activity_sequence_id } = installedRecord;
    await this.activitySequenceRepository.orm.delete(activity_sequence_id);
    await this.installedPackService.setPackAsUninstalledForUser(user_id, pack_id);
    return new ResponseMessage(`Habit pack with ID: ${pack_id} successfully uninstalled for user with ID: ${user_id}!`);
  }

  async installPackAsDefaultSettings(user_id: string, pack_id: string): Promise<UserSettingsResponseDto> {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
    const pack = await this.habitPackRepository.orm.findOneBy({ id: pack_id });
    if (!pack) throw new NotFoundException(`Habit pack with ID: ${pack_id} does not exist!`);
    await this.userSettingsService.clearUserActivities(user_id);
    await this.installHabitPack(user_id, pack_id);
    const updatedSettings = await this.userSettingsService.getSettings({ user_id });
    return updatedSettings;
  }

  async getUserInstalledPacks(user_id: string): Promise<HabitPack[]> {
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
  }
}
