import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { UserRepository } from '../../../user/repositories/user.repository';
import { UpsertHabitPackDto } from '../../dto/upsert-habit-pack.dto';
import { HabitPack } from '../../entity/habit-pack.entity';
import { HabitPackRepository } from '../../repositories/habit-pack.repository';
import { ActivityTemplateService } from '../../../activity-template/services/activity-template.service';
import { HabitPackType } from '../../domain/habit-pack-type.enum';
import { ActivityTemplateParserService } from '../../../activity-template/services/activity-template-parser.service';
import { UpdateActivityTemplateDto } from '../../../activity-template/dto/activity-template.dto';
import { ResponseMessage } from '../../../../shared/domain/response-message.model';
import { UserTypes } from '../../../user/domain/user-types.enum';
import { GetMultiplePacksQueryDto } from '../../dto/get-multiple-packs-query.dto';
import { ActivityParserService } from '../../../activity/services/activity-parser/activity-parser.service';
import { Activity } from '../../../activity/entities/activity.entity';

@Injectable()
export class HabitPackService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly habitPackRepository: HabitPackRepository,
    private readonly activityTemplateService: ActivityTemplateService,
    private readonly activityTemplateParserService: ActivityTemplateParserService,
    private readonly activityParserService: ActivityParserService,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async checkIfPackExists(pack_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Checking if pack exists',
        data: {
          pack_id,
        },
      });
      const habitPack = await this.habitPackRepository.orm.findOneBy({ id: pack_id });
      if (!habitPack) throw new NotFoundException(`Habit pack with id: ${pack_id} does not exist!`);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async getHabitPack(pack_id: string): Promise<HabitPack> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching habit pack',
        data: {
          pack_id,
        },
      });
      await this.checkIfPackExists(pack_id);
      const habitPack = await this.habitPackRepository.getHabitPack(pack_id);
      return this.serializeHabitPack(habitPack);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async getMultipleHabitPacks(getPacksQuery: GetMultiplePacksQueryDto, user_id: string): Promise<HabitPack[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching multiple habit packs',
        data: {
          getPacksQuery,
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      const fetchedPacks = await this.habitPackRepository.fetchPacksByFilter(getPacksQuery);
      const serializedApprovedPacks = fetchedPacks.map((pack) => this.serializeHabitPack(pack));
      return serializedApprovedPacks;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  serializeHabitPack({ activity_templates, pack_type, ...packData }: HabitPack): HabitPack {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Serializing habit pack',
      data: {
        pack_type,
      },
    });
    const serializedActivityTemplates = this.activityTemplateParserService.serialize(pack_type, activity_templates);
    const pack: HabitPack = { pack_type, ...packData, ...serializedActivityTemplates };
    return pack;
  }

  async upsertHabitPack(user_id: string, upsertHabitPackDto: UpsertHabitPackDto): Promise<HabitPack> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Upserting habit pack',
        data: {
          user_id,
          pack_id: upsertHabitPackDto.id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      const userIsAdmin = user.user_type === UserTypes.ADMIN;
      const habitPack = await this.habitPackRepository.orm.findOneBy({ id: upsertHabitPackDto.id });
      if (habitPack && habitPack.user_id !== user_id && !userIsAdmin) {
        throw new UnauthorizedException(
          `User with ID: ${user_id} is not authorized to edit habit pack with ID: ${upsertHabitPackDto.id}!`,
        );
      }
      const {
        pack_name,
        pack_type,
        description,
        description_video_url,
        welcome_message,
        welcome_video_url,
        marketplace_request,
        marketplace_approval_status,
        id,
        morning_activities,
        break_activities,
        evening_activities,
        standalone_activities,
        creator_name,
      } = upsertHabitPackDto;
      let approvalStatus;
      const approvalStatusHasChanged = marketplace_approval_status !== habitPack?.marketplace_approval_status;
      const approvalStatusIsFalse = typeof marketplace_approval_status !== 'undefined' && !marketplace_approval_status;
      if (userIsAdmin) {
        approvalStatus = marketplace_approval_status;
      } else if (approvalStatusHasChanged && approvalStatusIsFalse) {
        // only allows normal users to revoke marketplace approval, admin will review and approve
        // habit packs for the marketplace
        approvalStatus = false;
      } else {
        // if "marketplace_approval_status" is not sent with the request body the packs current status will be used,
        // if pack doesn't exist yet it will be "false" by default
        approvalStatus = habitPack?.marketplace_approval_status ?? false;
      }
      const longestSequenceDuration = this.getHabitPackLongestSequence([
        morning_activities,
        break_activities,
        evening_activities,
        standalone_activities,
      ]);
      let deserializedActivityTemplates;
      if (upsertHabitPackDto.pack_type === HabitPackType.standalone) {
        const activities = { standalone_activities };
        deserializedActivityTemplates = await this.activityTemplateParserService.deserializeStandaloneActivities(
          activities,
          user_id,
          id,
        );
      }
      if (upsertHabitPackDto.pack_type === HabitPackType.routine) {
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
      // allow admin user to edit pack creator, if not admin, use existing creator name, if new pack, use user's name
      const ifExistsUseSetName = habitPack ? habitPack.creator_name : user.name;
      const creatorNameToUse = userIsAdmin ? creator_name : ifExistsUseSetName;
      const newPack = new HabitPack({
        creator_name: creatorNameToUse,
        pack_name,
        pack_type,
        description,
        description_video_url,
        welcome_message,
        welcome_video_url,
        marketplace_request,
        marketplace_approval_status: approvalStatus,
        user_id,
        id,
        duration: longestSequenceDuration,
      });
      await this.habitPackRepository.consistentlyUpdateHabitPack(newPack, activityIds, deserializedActivityTemplates);
      return await this.getHabitPack(id);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async deleteHabitPack(user_id: string, pack_id: string): Promise<ResponseMessage> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Trying to delete habit pack',
        data: {
          user_id,
          pack_id,
        },
      });
      const pack = await this.habitPackRepository.orm.findOneBy({ id: pack_id });
      if (!pack) throw new NotFoundException(`Habit pack with id: ${pack_id} does not exist!`);
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (pack.user_id === user_id || user.user_type === UserTypes.ADMIN) {
        await this.activityTemplateService.bulkDeleteActivityTemplates(pack_id);
        await this.habitPackRepository.orm.softDelete({ id: pack_id, user_id });
        return new ResponseMessage(`Habit pack with ID: ${pack_id} successfully deleted!`);
      }
      throw new UnauthorizedException(
        `User with ID: ${user_id} is not authorized to delete habit pack with ID: ${pack_id}!`,
      );
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  getHabitPackLongestSequence(sequences: Activity[][]): number {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Getting longest sequence duration from habit pack',
    });
    const durations = sequences.map((sequence) => {
      if (sequence) {
        return this.activityParserService.calculateSequenceDuration(sequence);
      }
      return 0;
    });
    return Math.max(...durations);
  }
}
