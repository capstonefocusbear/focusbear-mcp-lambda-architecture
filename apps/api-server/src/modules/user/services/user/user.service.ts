import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Auth0ManagementService } from '../../../../../../../libs/auth0/src';
import { UserRepository } from '../../repositories/user.repository';
import { SyncUserAccountDto } from '../../dto/sync-user-account.dto';
import { UserAuthContext } from '../../../auth/domain/user-auth-context.model';
import { User } from '../../entities/user.entity';
import { RevenueCatService } from '../../../../../../../libs/revenue-cat/src';
import { SubscriptionService } from '../../../subscription/services/subscription/subscription.service';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { UpdateUserSettingsDto } from '../../dto/update-user-settings.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly revenueCatService: RevenueCatService,
    private readonly subscriptionService: SubscriptionService,
    private readonly userSettingsService: UserSettingsService,
    private readonly config: ConfigService,
  ) {}

  async syncUserAccount({ auth0_id, email }: SyncUserAccountDto): Promise<UserAuthContext> {
    const auth0User = await this.auth0ManagementService.getUser({ id: auth0_id }).catch(() => undefined);
    if (!auth0User) throw new NotFoundException('User does not exit in Auth0!');
    const registeredUser = await this.userRepository.orm.findOne({ where: { auth0_id } });
    const isNewUser = !registeredUser;
    const { id } = await this.userRepository.upsert({ auth0_id, email }, ['auth0_id']);
    await this.revenueCatService.getOrCreateSubscriber(id);
    if (isNewUser) await this.handleNewUser(id);
    return { id };
  }

  private async handleNewUser(id: string): Promise<void> {
    // eslint-disable-next-line no-spaced-func
    const settingsConfig = this.config.get<{ generateDefault: () => UpdateUserSettingsDto }>('constants.userSettings');
    const defaultSettings = settingsConfig.generateDefault();
    await Promise.all([
      this.subscriptionService.createInitialTrialForNewUser(id),
      this.userSettingsService.updateSettings({ user_id: id }, defaultSettings),
    ]);
  }

  async getUserDetails(id: string): Promise<User> {
    const userDetails = await this.userRepository.getUserDetails(id);
    if (!userDetails) throw new NotFoundException(`User with id: ${id} does not exit!`);
    return userDetails;
  }
}
