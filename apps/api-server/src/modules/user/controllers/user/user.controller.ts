import { Body, Controller, Get, Post, Put, Query, Sse, UseGuards, Res, Patch } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { CurrentActivityProps } from '../../../activity/domain/current-activity-props.model';
import { CompletedActivity } from '../../../activity/entities/completed-activity.entity';
import { Passport } from '../../../auth/domain/passport.model';
import { UserAuthContext } from '../../../auth/domain/user-auth-context.model';
import { HasAuth0ActionSecret } from '../../../auth/guards/has-auth0-action-secret/has-auth0-action-secret.guard';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { CompletedFocusBlock } from '../../../focus-mode/entities/completed-focus-block.entity';
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
import { OnboardingStatsResponseDto } from '../../dto/onboarding-stats-response.dto';
import { GenerateChatBotResponseDto } from '../../dto/generate-chatbot-response.dto';
import { IsUrlSafeDto } from '../../dto/is-url-safe.dto';
import { OpenAIService } from '../../../../../../../libs/openai/src';
import { MotivationalSummaryQueryDto } from '../../dto/get-motivational-summary-query.dto';
import { UpdateLongTermGoalsDto } from '../../dto/update-long-term-goals.dto';

@Controller('user')
@ApiTags('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userConsentService: UserConsentService,
    private readonly userDailyStatsService: UserDailyStatsService,
    private readonly openAIService: OpenAIService,
  ) {}

  @Put('/account-sync')
  @ApiSecurity('Auth0ActionSecret')
  @ApiOperation({
    summary: 'DO NOT USE IT FROM THE FRONT_END! This route should be used only by the Auth0s "post-login" hook.',
  })
  @UseGuards(HasAuth0ActionSecret)
  async syncUserAccount(@Body() { auth0_id, email, name }: SyncUserAccountDto): Promise<UserAuthContext> {
    return this.userService.syncUserAccount({ auth0_id, email, name });
  }

  @Get('/details')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getUserDetails(@AuthContext() { user }: Passport): Promise<User> {
    return this.userService.getUserDetails(user.id);
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
  async getUserById(
    @Query() { id, stripe_customer_id }: { id: string; stripe_customer_id: string },
    @AuthContext() { user }: Passport,
  ): Promise<User> {
    return this.userService.getUserById(user.id, id, stripe_customer_id);
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
  async upsertUserConsent(@Body() userConsent: UpdateUserConsentDto, @AuthContext() { user }: Passport) {
    return this.userConsentService.upsertUserConsent(userConsent, user.id);
  }

  @Get('stats/onboarding')
  @UseGuards(IsAuth)
  async getUserStats(@AuthContext() { user }: Passport): Promise<OnboardingStatsResponseDto> {
    return this.userDailyStatsService.CalculateUserStatsResponse(user.id);
  }

  @Post('access-request')
  @UseGuards(IsAdmin)
  @UseGuards(IsAuth)
  async saveAdminAccessRequest(
    @Body() { access_reason }: { access_reason: string },
    @AuthContext() { user }: Passport,
  ) {
    return this.userService.saveAdminAccessRequest(user.id, access_reason);
  }

  @Get('subscription')
  @UseGuards(IsAuth)
  async getUserSubscription(@AuthContext() { user }: Passport) {
    return this.userService.getSubscription(user.id);
  }

  @Get('/motivational-summary')
  @Sse()
  @UseGuards(IsAuth)
  async getMotivationalSummary(
    @Res() response: FastifyReply,
    @Query() { language, tone }: MotivationalSummaryQueryDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.userService.getMotivationalMessage(response, user.id, language, tone);
  }

  @Post('/chat')
  @Sse()
  @UseGuards(IsAuth)
  getCompletion(
    @Res() response: FastifyReply,
    @Body() { chat, language }: GenerateChatBotResponseDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.userService.generateChatReply(response, user.id, chat, language);
  }

  @Post('/is-url-safe-to-use')
  @UseGuards(IsAuth)
  async checkIfURLIsSafe(@Body() isUrlSafeDto: IsUrlSafeDto) {
    return this.openAIService.checkIfUrlIsSafeToUse(isUrlSafeDto);
  }

  @Patch('/long-term-goals')
  @UseGuards(IsAuth)
  async updateUserLongTermGoals(@Body() { goals }: UpdateLongTermGoalsDto, @AuthContext() { user }: Passport) {
    return this.userService.updateLongTermGoals(user.id, { goals });
  }
}
