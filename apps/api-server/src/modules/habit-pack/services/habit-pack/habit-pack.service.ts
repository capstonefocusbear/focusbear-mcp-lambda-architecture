import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { convert as htmlToPlainText } from 'html-to-text';
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
import { User } from '../../../user/entities/user.entity';

@Injectable()
export class HabitPackService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly habitPackRepository: HabitPackRepository,
    private readonly activityTemplateService: ActivityTemplateService,
    private readonly activityTemplateParserService: ActivityTemplateParserService,
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

  async getMultipleHabitPacks(getPacksQuery: GetMultiplePacksQueryDto): Promise<HabitPack[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching multiple habit packs',
        data: {
          getPacksQuery,
        },
      });
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
        id,
        morning_activities,
        break_activities,
        evening_activities,
        standalone_activities,
        creator_name,
        language,
      } = upsertHabitPackDto;
      const { marketplaceApprovalStatus, isFeatured, isFeaturedForOnboarding } = this.determineAdminProperties(
        userIsAdmin,
        upsertHabitPackDto,
        habitPack,
      );
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
      const creatorName = this.determinePackCreatorName(habitPack, user, creator_name, userIsAdmin);
      const hasOnlyBreakActivities = this.checkIfPackOnlyHasBreakActivities({
        morning_activities,
        evening_activities,
        break_activities,
      });
      const isBreaksOnlyPack = pack_type === HabitPackType.routine && hasOnlyBreakActivities;
      const newPack = new HabitPack({
        creator_name: creatorName,
        pack_name,
        pack_type,
        description,
        description_plain_text: htmlToPlainText(description),
        description_video_url,
        welcome_message,
        welcome_message_plain_text: htmlToPlainText(welcome_message),
        welcome_video_url,
        marketplace_request,
        marketplace_approval_status: marketplaceApprovalStatus,
        is_featured: isFeatured,
        featured_for_onboarding: isFeaturedForOnboarding,
        user_id,
        id,
        duration: longestSequenceDuration,
        morning_routine_duration_seconds: this.calculateSequenceDuration(morning_activities, pack_type),
        evening_routine_duration_seconds: this.calculateSequenceDuration(evening_activities, pack_type),
        breaks_only: isBreaksOnlyPack,
        language,
      });
      await this.habitPackRepository.consistentlyUpdateHabitPack(newPack, activityIds, deserializedActivityTemplates);
      return await this.getHabitPack(id);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  checkIfPackOnlyHasBreakActivities({
    morning_activities,
    evening_activities,
    break_activities,
  }: {
    morning_activities: UpdateActivityTemplateDto[];
    evening_activities: UpdateActivityTemplateDto[];
    break_activities: UpdateActivityTemplateDto[];
  }): boolean {
    const hasMorningActivities = morning_activities?.length !== 0;
    const hasEveningActivities = evening_activities?.length !== 0;
    const hasBreakActivities = break_activities?.length !== 0;
    return !hasMorningActivities && !hasEveningActivities && hasBreakActivities;
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

  calculateSequenceDuration(sequence: UpdateActivityTemplateDto[], packType: HabitPackType): number {
    if (packType === HabitPackType.standalone) {
      return 0;
    }
    const duration = sequence.reduce((total, activity) => total + activity.duration_seconds, 0);
    return duration;
  }

  getHabitPackLongestSequence(sequences: UpdateActivityTemplateDto[][]): number {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Getting longest sequence duration from habit pack',
    });
    const allSequenceDurations = sequences.map((sequence) => {
      if (sequence) {
        const sequenceActivityDurations = sequence.map(({ duration_seconds }) => Number(duration_seconds));
        const addUp = (accumulator: number, item: number): number => accumulator + item;
        const initialAccumulator = 0;
        const sequenceDuration = sequenceActivityDurations.reduce(addUp, initialAccumulator);
        return sequenceDuration;
      }
      return 0;
    });
    return Math.max(...allSequenceDurations);
  }

  determineAdminProperties(userIsAdmin: boolean, upsertHabitPack: UpsertHabitPackDto, existingHabitPack: HabitPack) {
    const { marketplace_approval_status, is_featured, featured_for_onboarding } = upsertHabitPack;
    let marketplaceApprovalStatus;
    let isFeatured;
    let isFeaturedForOnboarding;
    const isExistingMarketplaceStatus = typeof existingHabitPack?.marketplace_approval_status === 'boolean';
    const existingMarketplaceStatus = existingHabitPack?.marketplace_approval_status;
    const isExistingIsFeaturedStatus = typeof existingHabitPack?.is_featured === 'boolean';
    const existingIsFeaturedStatus = existingHabitPack?.is_featured;
    const isExistingIsFeaturedForOnboardingStatus = typeof existingHabitPack?.featured_for_onboarding === 'boolean';
    const existingIsFeaturedForOnboardingStatus = existingHabitPack?.featured_for_onboarding;
    if (userIsAdmin) {
      marketplaceApprovalStatus = marketplace_approval_status;
      isFeatured = is_featured;
      isFeaturedForOnboarding = featured_for_onboarding;
    } else {
      marketplaceApprovalStatus = isExistingMarketplaceStatus ? existingMarketplaceStatus : false;
      isFeatured = isExistingIsFeaturedStatus ? existingIsFeaturedStatus : false;
      isFeaturedForOnboarding = isExistingIsFeaturedForOnboardingStatus ? existingIsFeaturedForOnboardingStatus : false;
    }
    return { marketplaceApprovalStatus, isFeatured, isFeaturedForOnboarding };
  }

  determinePackCreatorName(habitPack: HabitPack, user: User, upsertName: string, userIsAdmin: boolean) {
    // allow admin user to edit pack creator name, if not admin, use existing creator name, if new pack, use user's name
    const ifExistingPackUseSetName = habitPack ? habitPack.creator_name : user.name;
    const creatorNameToUse = userIsAdmin ? upsertName : ifExistingPackUseSetName;
    return creatorNameToUse;
  }
}
