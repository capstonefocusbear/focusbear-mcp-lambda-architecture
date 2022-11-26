import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Auth0ManagementService } from '../../../../../../../libs/auth0/src';
import { UserRepository } from '../../repositories/user.repository';
import { SyncUserAccountDto } from '../../dto/sync-user-account.dto';
import { UserAuthContext } from '../../../auth/domain/user-auth-context.model';
import { User } from '../../entities/user.entity';
import { RevenueCatService } from '../../../../../../../libs/revenue-cat/src';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { UpdateLocalDeviceSettingsDto } from '../../dto/update-local-device-settings.dto';
import { StripeService } from '../../../../../../../libs/stripe/src';
import { CurrentActivityProps } from '../../../activity/domain/current-activity-props.model';
import { GetUsersQueryDto } from '../../dto/get-users-query.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly revenueCatService: RevenueCatService,
    @Inject(forwardRef(() => UserSettingsService))
    private readonly userSettingsService: UserSettingsService,
    private readonly stripeService: StripeService,
    private readonly config: ConfigService,
  ) {}

  async syncUserAccount({ auth0_id, email, name }: SyncUserAccountDto): Promise<UserAuthContext> {
    const [auth0User, registeredUser] = await this.consistentlyGetUser(auth0_id);
    if (!auth0User) throw new NotFoundException('User does not exit in Auth0!');
    const { id, stripe_customer_id } = await this.updateOrCreateUser({ auth0_id, email, name }, registeredUser);
    if (!registeredUser) await this.handleInitialRegistration(id);
    const subscriber = await this.revenueCatService.getOrCreateSubscriber(id);
    const subscriptionStatus = this.revenueCatService.checkSubscriptionStatus(subscriber.subscriber);
    return { id, subscriptionStatus, stripeCustomerId: stripe_customer_id };
  }

  private async consistentlyGetUser(auth0_id: string): Promise<[any, User]> {
    const auth0UserPromise = this.auth0ManagementService.getUser({ id: auth0_id }).catch(() => undefined);
    const dbUserPromise = this.userRepository.orm.findOne({ where: { auth0_id } });
    const [auth0User, dbUser] = await Promise.all([auth0UserPromise, dbUserPromise]);
    return [auth0User, dbUser];
  }

  private async updateOrCreateUser(
    { auth0_id, email, name }: SyncUserAccountDto,
    registeredUser?: User,
  ): Promise<User> {
    const hasNoStripeCustomer = !registeredUser?.stripe_customer_id;
    const hasNameDefined = Boolean(registeredUser?.name);
    const userProperties = hasNameDefined ? { auth0_id, email } : { auth0_id, email, name };
    if (hasNoStripeCustomer) {
      const stripeCustomer = await this.stripeService.registerNewCustomer(email);
      Object.assign(userProperties, { stripe_customer_id: stripeCustomer.id });
    }
    return this.userRepository.upsert(userProperties, ['auth0_id']);
  }

  private async handleInitialRegistration(id: string): Promise<void> {
    const settingsConfig = this.config.get('constants.userSettings');
    const defaultSettings = settingsConfig.generateDefault();
    await Promise.all([
      this.revenueCatService.grantTrialAccess(id),
      this.userSettingsService.updateSettings({ user_id: id }, defaultSettings, false),
    ]);
  }

  async getUserDetails(id: string): Promise<User> {
    const userDetails = await this.userRepository.getUserDetails(id);
    if (!userDetails) throw new NotFoundException(`User with id: ${id} does not exit!`);
    return userDetails;
  }

  async getUserCurrentActivityProps(id: string): Promise<CurrentActivityProps> {
    const partialUser = await this.userRepository.getUserCurrentActivityProps(id);
    if (!partialUser) throw new NotFoundException(`User with id: ${id} does not exit!`);
    const currentActivityProps = new CurrentActivityProps(partialUser);
    return currentActivityProps;
  }

  async updateUserLocalDeviceSettings(
    user_id: string,
    local_device_settings: UpdateLocalDeviceSettingsDto,
  ): Promise<UpdateLocalDeviceSettingsDto> {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exit!`);
    const updatedSettings = this.mergeLocalSettings(user.local_device_settings, local_device_settings);
    await this.userRepository.orm.update(user_id, { local_device_settings: updatedSettings });
    return updatedSettings;
  }

  async getUserLocalDeviceSettings(user_id: string): Promise<UpdateLocalDeviceSettingsDto> {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exit!`);
    if (!user.local_device_settings) {
      return { iOS: null, Windows: null, MacOS: null, Android: null, Web: { hasEditedSettings: false } };
    }
    return user.local_device_settings;
  }

  private mergeLocalSettings(saved?: UpdateLocalDeviceSettingsDto, update?: UpdateLocalDeviceSettingsDto) {
    const baseVersion = {
      MacOS: saved?.MacOS || null,
      Windows: saved?.Windows || null,
      Android: saved?.Android || null,
      iOS: saved?.iOS || null,
      Web: saved?.Web || { hasEditedSettings: false },
    };
    const hasWrongSchema = !update || typeof update !== 'object' || Array.isArray(update);
    if (hasWrongSchema) return baseVersion;
    return Object.assign(baseVersion, update);
  }

  async markUserSettingsAsEdited(user_id: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exit!`);
    const updatedWebSettings = { Web: { hasEditedSettings: true } };
    const updatedSettings = this.mergeLocalSettings(user.local_device_settings, updatedWebSettings);
    await this.userRepository.orm.update(user_id, { local_device_settings: updatedSettings });
  }

  async getUsers({ search }: GetUsersQueryDto) {
    return this.userRepository.getUsersList({ search });
  }
}
