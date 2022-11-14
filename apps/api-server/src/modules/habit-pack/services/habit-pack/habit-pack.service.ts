import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from '../../../user/repositories/user.repository';
import { CreateHabitPackDto } from '../../dto/create-habit-pack-param.dto';
import { HabitPack } from '../../entity/habit-pack.entity';
import { HabitPackRepository } from '../../repositories/habit-pack.repository';
import { ActivityTemplateService } from '../../../activity-template/services/activity-template.service';
import { HabitPackType } from '../../domain/habit-pack-type.enum';
import { ActivityTemplateParserService } from '../../../activity-template/services/activity-template-parser.service';
import { UpdateActivityTemplateDto } from '../../../activity-template/dto/activity-template.dto';
import { ResponseMessage } from '../../../../shared/domain/response-message.model';
import { UserTypes } from '../../../user/domain/user-types.enum';
import { GetMultiplePacksQueryDto } from '../../dto/get-multiple-packs-query.dto';

@Injectable()
export class HabitPackService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly habitPackRepository: HabitPackRepository,
    private readonly activityTemplateService: ActivityTemplateService,
    private readonly activityTemplateParserService: ActivityTemplateParserService,
  ) {}

  async checkIfPackExists(pack_id: string) {
    const habitPack = await this.habitPackRepository.orm.findOne(pack_id);
    if (!habitPack) throw new NotFoundException(`Habit pack with id: ${pack_id} does not exist!`);
  }

  async getHabitPack(pack_id: string): Promise<HabitPack> {
    await this.checkIfPackExists(pack_id);
    const habitPack = await this.habitPackRepository.getHabitPack(pack_id);
    return this.serializeHabitPack(habitPack);
  }

  async getMultipleHabitPacks(getPacksQuery: GetMultiplePacksQueryDto, user_id: string): Promise<HabitPack[]> {
    const user = await this.userRepository.orm.findOne(user_id);
    if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
    const fetchedPacks = await this.habitPackRepository.fetchPacksByFilter(getPacksQuery);
    const serializedApprovedPacks = fetchedPacks.map((pack) => this.serializeHabitPack(pack));
    return serializedApprovedPacks;
  }

  serializeHabitPack({ activity_templates, pack_type, ...packData }: HabitPack): CreateHabitPackDto {
    const serializedActivityTemplates = this.activityTemplateParserService.serialize(pack_type, activity_templates);
    const pack: HabitPack = { pack_type, ...packData, ...serializedActivityTemplates };
    return pack;
  }

  async createHabitPack(user_id: string, createHabitPackDto: CreateHabitPackDto): Promise<HabitPack> {
    const user = await this.userRepository.orm.findOne(user_id);
    if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
    const {
      pack_name,
      pack_type,
      description,
      description_video_url,
      welcome_message,
      welcome_video_url,
      marketplace_request,
      id,
    } = createHabitPackDto;
    const newPack = new HabitPack({
      creator_name: user.name,
      pack_name,
      pack_type,
      description,
      description_video_url,
      welcome_message,
      welcome_video_url,
      marketplace_request,
      user_id,
      id,
    });
    let deserializedActivityTemplates;
    if (createHabitPackDto.pack_type === HabitPackType.standalone) {
      const { standalone_activities } = createHabitPackDto;
      const activities = { standalone_activities };
      deserializedActivityTemplates = await this.activityTemplateParserService.deserializeStandaloneActivities(
        activities,
        user_id,
        id,
      );
    }
    if (createHabitPackDto.pack_type === HabitPackType.routine) {
      const { morning_activities, break_activities, evening_activities } = createHabitPackDto;
      const activities = { morning_activities, break_activities, evening_activities };
      deserializedActivityTemplates = await this.activityTemplateParserService.deserializeRoutineActivities(
        activities,
        user_id,
        id,
      );
    }
    const activityIds = [];
    await deserializedActivityTemplates.map((activityType) => {
      return activityType.map((activity_template: UpdateActivityTemplateDto) => {
        return activityIds.push(activity_template.id);
      });
    });
    await this.habitPackRepository.consistentlyUpdateHabitPack(newPack, activityIds, deserializedActivityTemplates);
    return this.getHabitPack(id);
  }

  async deleteHabitPack(user_id: string, pack_id: string): Promise<ResponseMessage> {
    const pack = await this.habitPackRepository.orm.findOne({ id: pack_id });
    if (!pack) throw new NotFoundException(`Habit pack with id: ${pack_id} does not exist!`);
    const user = await this.userRepository.orm.findOne(user_id);
    if (pack.user_id === user_id || user.user_type === UserTypes.ADMIN) {
      await this.activityTemplateService.bulkDeleteActivityTemplates(pack_id);
      await this.habitPackRepository.orm.softDelete({ id: pack_id, user_id });
      return new ResponseMessage(`Habit pack with ID: ${pack_id} successfully deleted!`);
    }
    throw new UnauthorizedException(
      `User with ID: ${user_id} is not authorized to delete habit pack with ID: ${pack_id}!`,
    );
  }
}
