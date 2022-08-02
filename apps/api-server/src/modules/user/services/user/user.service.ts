import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Auth0ManagementService } from '../../../../../../../libs/auth0/src';
import { UserRepository } from '../../repositories/user.repository';
import { SyncUserAccountDto } from '../../dto/sync-user-account.dto';
import { UserAuthContext } from '../../../auth/domain/user-auth-context.model';
import { User } from '../../entities/user.entity';
import { RevenueCatService } from '../../../../../../../libs/revenue-cat/src';
import { UserSettingsService } from '../user-settings/user-settings.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly revenueCatService: RevenueCatService,
    private readonly userSettingsService: UserSettingsService,
    private readonly config: ConfigService,
  ) {}

  async syncUserAccount({ auth0_id, email }: SyncUserAccountDto): Promise<UserAuthContext> {
    const [auth0User, registeredUser] = await this.consistentlyGetUser(auth0_id);
    if (!auth0User) throw new NotFoundException('User does not exit in Auth0!');
    const { id } = await this.userRepository.upsert({ auth0_id, email }, ['auth0_id']);
    if (!registeredUser) await this.handleInitialRegistration(id);
    const subscriber = await this.revenueCatService.getOrCreateSubscriber(id);
    const subscriptionStatus = this.revenueCatService.checkSubscriptionStatus(subscriber.subscriber);
    return { id, subscriptionStatus };
  }

  private async consistentlyGetUser(auth0_id: string): Promise<[any, User]> {
    const auth0UserPromise = this.auth0ManagementService.getUser({ id: auth0_id }).catch(() => undefined);
    const dbUserPromise = this.userRepository.orm.findOne({ where: { auth0_id } });
    const [auth0User, dbUser] = await Promise.all([auth0UserPromise, dbUserPromise]);
    return [auth0User, dbUser];
  }

  private async handleInitialRegistration(id: string): Promise<void> {
    const settingsConfig = this.config.get('constants.userSettings');
    const defaultSettings = settingsConfig.generateDefault();
    await Promise.all([
      this.revenueCatService.grantTrialAccess(id),
      this.userSettingsService.updateSettings({ user_id: id }, defaultSettings),
    ]);
  }

  async getUserDetails(id: string): Promise<User> {
    const userDetails = await this.userRepository.getUserDetails(id);
    if (!userDetails) throw new NotFoundException(`User with id: ${id} does not exit!`);
    return userDetails;
  }
}
