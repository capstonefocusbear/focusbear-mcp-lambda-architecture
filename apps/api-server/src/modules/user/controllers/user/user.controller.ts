import { Body, Controller, Get, Post, Put, Query, Sse, UseGuards, Res, Patch, Logger } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Throttle } from '@nestjs/throttler';
import { TRIAL_LENGTH_DAYS, ONE_HOUR_MILLISECONDS } from '../../../../shared/utils/constants';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { CurrentActivityProps } from '../../../activity/domain/current-activity-props.model';
import { CompletedActivity } from '../../../activity/entities/completed-activity.entity';
import { Passport } from '../../../auth/domain/passport.model';
import { UserAuthContext } from '../../../auth/domain/user-auth-context.model';
import { HasAuth0ActionSecret } from '../../../auth/guards/has-auth0-action-secret/has-auth0-action-secret.guard';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { CompletedFocusBlock } from '../../../focus-mode/entities/completed-focus-block.entity';
import { FocusMode } from '../../../focus-mode/entities/focus-mode.entity';
import { Entitlement } from '../../../subscription/domain/entitlement.enum';
import {
  HasSubscription,
  RequireEntitlements,
} from '../../../subscription/guards/has-subscription/has-subscription.guard';
import { GetUsersListQueryDto } from '../../dto/get-users-list-query.dto';
import { GetUsersQueryDto } from '../../dto/get-users-query.dto';
import { SyncUserAccountDto } from '../../dto/sync-user-account.dto';
import { User } from '../../entities/user.entity';
import { UserService } from '../../services/user/user.service';
import { IsAdmin } from '../../../auth/guards/is-admin/is-admin.guard';
import { UpdateUserSignUpFieldDto } from '../../dto/update-user-sign-up-field.dto';
import { UpdateUserMetadataDto } from '../../dto/update-user-metadata.dto';
import { UpdateUserConsentDto } from '../../dto/update-user-consent.dto';
import { UserConsentService } from '../../services/user-consent/user-consent.service';
import { UserDailyStatsService } from '../../services/user-daily-stats/user-daily-stats.service';
import { GetUserSummaryQueryDto } from '../../dto/get-user-summary-query.dto';
import { UserSummaryResponseDto } from '../../dto/user-summary-response.dto';
import { OnboardingStatsResponseDto } from '../../dto/onboarding-stats-response.dto';
import { GenerateChatBotResponseDto } from '../../dto/generate-chatbot-response.dto';
import { IsUrlSafeDto } from '../../dto/is-url-safe.dto';
import { IsAppSafeDto } from '../../dto/is-app-safe.dto';
import { MotivationalSummaryQueryDto } from '../../dto/get-motivational-summary-query.dto';
import { UpdateLongTermGoalsDto } from '../../dto/update-long-term-goals.dto';
import { UpdateUsernameDto } from '../../dto/update-username.dto';
import { SearchForUserDto } from '../../dto/search-for-user.dto';
import { Disabled } from '../../../../shared/decorators/disabled.decorator';
import { UninstallApplicationQueryDto } from '../../dto/uninstall-application-query.dto';
import { UpdateEmailPreferencesDto } from '../../dto/update-email-preferences.dto';
import { EmailPreferencesResponseDto } from '../../dto/email-preferences-response.dto';
import { UnsubscribeEmailDto } from '../../dto/unsubscribe-email.dto';
import { UserEmailPreferencesService } from '../../services/user-email-preferences/user-email-preferences.service';
import { EmailTemplateCompilerService } from '../../../email/services/email-template-compiler/email-template-compiler.service';
import { UpdateEmailPreferencesWithTokenDto } from '../../dto/update-email-preferences-with-token.dto';

@Controller('user')
@ApiTags('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userConsentService: UserConsentService,
    private readonly userDailyStatsService: UserDailyStatsService,
    private readonly userEmailPreferencesService: UserEmailPreferencesService,
    private readonly emailTemplateCompilerService: EmailTemplateCompilerService,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  private readonly logger = new Logger(UserController.name);

  @Put('/account-sync')
  @ApiSecurity('Auth0ActionSecret')
  @ApiOperation({
    summary: 'DO NOT USE IT FROM THE FRONT_END! This route should be used only by the Auth0s "post-login" hook.',
  })
  @UseGuards(HasAuth0ActionSecret)
  async syncUserAccount(@Body() { auth0_id, email, auth0_client }: SyncUserAccountDto): Promise<UserAuthContext> {
    return this.userService.syncUserAccount({ auth0_id, email, auth0_client });
  }

  @Get('/details')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getUserDetails(@AuthContext() { user }: Passport): Promise<User> {
    return this.userService.getUserDetails(user.id);
  }

  @Get('/details/summary')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getUserSummary(
    @Query() { from }: GetUserSummaryQueryDto,
    @AuthContext() { user }: Passport,
  ): Promise<UserSummaryResponseDto> {
    return this.userService.getUserSummary(user.id, from);
  }

  @Get('/details/current-activity-props')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getUserCurrentActivity(@AuthContext() { user }: Passport): Promise<CurrentActivityProps> {
    return this.userService.getUserCurrentActivityProps(user.id);
  }

  @Get('/list')
  @UseGuards(IsAuth, HasSubscription)
  @ApiSecurity('Auth0AccessToken')
  @RequireEntitlements([Entitlement.team_owner])
  async getUsersList(@Query() { search }: GetUsersQueryDto): Promise<User[]> {
    return this.userService.getUsers({ search });
  }

  @Get('/weekly-focus-block-summary')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getUserFocusBlockSummary(@AuthContext() { user }: Passport): Promise<CompletedFocusBlock[]> {
    return this.userService.getFocusBlockSummary(user.id);
  }

  @Get('/weekly-completed-activity-summary')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getUserCompletedActivitySummary(@AuthContext() { user }: Passport): Promise<CompletedActivity[]> {
    return this.userService.getCompletedActivitySummary(user.id);
  }

  @Get('focus-modes')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getUserFocusModes(@AuthContext() { user }: Passport): Promise<FocusMode[]> {
    return this.userService.getUserFocusModes(user.id);
  }

  @Get('/user-list')
  @UseGuards(IsAdmin)
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getListOfUsers(
    @Query() { take, skip, order_by }: GetUsersListQueryDto,
    @AuthContext() { user }: Passport,
  ): Promise<User[]> {
    return this.userService.getListOfUsers(user.id, take, skip, order_by);
  }

  @Get()
  @UseGuards(IsAdmin)
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getUserById(@Query() { id, stripe_customer_id, email }: SearchForUserDto, @AuthContext() { user }: Passport) {
    return this.userService.getUserById(user.id, { id, stripe_customer_id, email });
  }

  @Put('sign-up-template')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async updateUserSignUpTemplate(@Body() ids: UpdateUserSignUpFieldDto, @AuthContext() { user }: Passport) {
    return this.userService.updateUserSignUpField(ids, user.id);
  }

  @Put('metadata')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async updateUserMetadata(
    @Body() { profile_image, description }: UpdateUserMetadataDto,
    @AuthContext() { user }: Passport,
  ): Promise<void> {
    return this.userService.updateMetadata({ profile_image, description }, user.id);
  }

  @Put('consent')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async upsertUserConsent(
    @Body() userConsent: UpdateUserConsentDto | UpdateUserConsentDto[],
    @AuthContext() { user }: Passport,
  ) {
    if (Array.isArray(userConsent)) {
      return this.userConsentService.upsertUserConsents(userConsent, user.id);
    }
    return this.userConsentService.upsertUserConsent(userConsent, user.id);
  }

  @Get('stats/onboarding')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getUserStats(@AuthContext() { user }: Passport): Promise<OnboardingStatsResponseDto> {
    return this.userDailyStatsService.CalculateUserStatsResponse(user.id);
  }

  @Post('access-request')
  @UseGuards(IsAdmin)
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async saveAdminAccessRequest(
    @Body() { access_reason }: { access_reason: string },
    @AuthContext() { user }: Passport,
  ) {
    return this.userService.saveAdminAccessRequest(user.id, access_reason);
  }

  @Get('subscription')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getUserSubscription(@AuthContext() { user }: Passport) {
    const subscription = await this.userService.getSubscription(user.id);
    // check if its a new user within 7 days
    const userDetails = await this.userService.getUserDetails(user.id);
    const userCreatedDate = new Date(userDetails.created_at);
    const currentDate = new Date();
    const diffInMilliS = currentDate.getTime() - userCreatedDate.getTime();
    // caputre errror on sentry if sucscriptions is []on new user
    if (subscription.activeEntitlements.length === 0 && diffInMilliS < TRIAL_LENGTH_DAYS * ONE_HOUR_MILLISECONDS * 24) {
      this.sentryService.instance().captureMessage('User has no subscription', {
        extra: { user_id: user.id, subscription },
      });
    }
    return subscription;
  }

  @Get('/motivational-summary')
  @Sse()
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getMotivationalSummary(
    @Res() response: FastifyReply,
    @Query() { language, tone, routine, device_type }: MotivationalSummaryQueryDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.userService.getMotivationalMessage(response, user.id, { language, tone, routine, device_type });
  }

  @Disabled()
  @Post('/chat')
  @Sse()
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  getCompletion(
    @Res() response: FastifyReply,
    @Body() { chat, language }: GenerateChatBotResponseDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.userService.generateChatReply(response, user.id, chat, language);
  }

  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  @Post('/is-url-safe-to-use')
  async checkIfURLIsSafe(@Body() isUrlSafeDto: IsUrlSafeDto, @AuthContext() { user }: Passport) {
    return this.userService.checkIsUrlSafe(isUrlSafeDto, user.id);
  }

  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  @Post('/is-app-safe-to-use')
  async checkIfAppIsSafe(@Body() isAppSafeDto: IsAppSafeDto, @AuthContext() { user }: Passport) {
    return this.userService.checkIsAppSafe(isAppSafeDto, user.id);
  }

  @Patch('/long-term-goals')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async updateUserLongTermGoals(@Body() { goals }: UpdateLongTermGoalsDto, @AuthContext() { user }: Passport) {
    return this.userService.updateLongTermGoals(user.id, { goals });
  }

  @Put('/long-term-goals')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async updateLongTermGoals(@Body() { goals }: UpdateLongTermGoalsDto, @AuthContext() { user }: Passport) {
    return this.userService.updateLongTermGoals(user.id, { goals });
  }

  @Get('/long-term-goals')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getLongTermGoals(@AuthContext() { user }: Passport) {
    return this.userService.getUserLongTermGoals(user.id);
  }

  @Put('/username')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async updateUsername(@Body() { username }: UpdateUsernameDto, @AuthContext() { user }: Passport) {
    return this.userService.updateUsername(user.id, { username });
  }

  @Get('/synced-external-platforms')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getSyncedExternalPlatforms(@AuthContext() { user }: Passport) {
    return this.userService.getSyncedExternalPlatforms(user.id);
  }

  @Post('/uninstall')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async uninstallApplication(
    @Query() uninstallApplicationQueryDto: UninstallApplicationQueryDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.userService.uninstallApplication(uninstallApplicationQueryDto, user.id);
  }

  @Get('email-preferences')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  @ApiOperation({ summary: 'Get user email preferences' })
  async getEmailPreferences(@AuthContext() { user }: Passport): Promise<EmailPreferencesResponseDto> {
    return this.userEmailPreferencesService.getEmailPreferences(user.id);
  }

  @Put('email-preferences')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  @ApiOperation({ summary: 'Update user email preferences' })
  @Throttle({ default: { ttl: 60, limit: 10 } })
  async updateEmailPreferences(
    @AuthContext() { user }: Passport,
    @Body() dto: UpdateEmailPreferencesDto,
  ): Promise<EmailPreferencesResponseDto> {
    return this.userEmailPreferencesService.updateEmailPreferences(user.id, dto);
  }

  @Get('email-preferences/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe confirmation page' })
  async getUnsubscribePage(@Query('token') token: string, @Res() response: FastifyReply): Promise<void> {
    try {
      const html = await this.emailTemplateCompilerService.compilePage('unsubscribe', {
        token,
        apiUrl: process.env.API_URL,
      });

      response.type('text/html');
      response.send(html);
    } catch (error) {
      this.logger.error('Failed to render unsubscribe page:', error);
      response.status(500).send('Error loading unsubscribe page');
    }
  }

  @Post('email-preferences/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from emails using token' })
  async unsubscribeFromEmails(@Body() dto: UnsubscribeEmailDto): Promise<{ message: string }> {
    await this.userEmailPreferencesService.unsubscribeFromEmails(dto);
    return { message: 'Successfully unsubscribed from emails' };
  }

  @Get('email-preferences/manage')
  @ApiOperation({ summary: 'Email preferences management page' })
  async getEmailPreferencesManagePage(@Query('token') token: string, @Res() response: FastifyReply): Promise<void> {
    try {
      if (!token) {
        this.logger.error('No token provided for email preferences management page');
        response.status(400).send('Token is required');
        return;
      }

      // Verify token and get user preferences
      const preferences = await this.userEmailPreferencesService.getEmailPreferencesWithToken(token);

      const templateData = {
        token,
        currentFrequency: preferences.email_frequency,
        apiUrl: process.env.API_URL,
      };

      const html = await this.emailTemplateCompilerService.compilePage('manage-preferences', templateData);

      response.type('text/html');
      response.send(html);
    } catch (error) {
      this.logger.error('Failed to render email preferences management page:', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        token: token ? 'present' : 'missing',
        timestamp: new Date().toISOString(),
      });
      response.status(500).send(`Error loading preferences page: ${error.message}`);
    }
  }

  @Post('email-preferences/manage')
  @ApiOperation({ summary: 'Update email preferences using token' })
  async updateEmailPreferencesWithToken(@Body() dto: UpdateEmailPreferencesWithTokenDto): Promise<{ message: string }> {
    await this.userEmailPreferencesService.updateEmailPreferencesWithToken(dto.token, dto.email_frequency);
    return { message: 'Email preferences updated successfully' };
  }
}
