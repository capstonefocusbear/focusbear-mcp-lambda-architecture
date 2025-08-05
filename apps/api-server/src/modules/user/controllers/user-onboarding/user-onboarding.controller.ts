import { Body, Controller, Get, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserOnboardingService } from '../../services/user-onboarding/user-onboarding.service';
import { UserService } from '../../services/user/user.service';
import { UpdateOnboardingProgressDto } from '../../dto/onboarding/update-onboarding-progress.dto';
import { GetUserOnboardingQueryDto } from '../../dto/onboarding/get-user-onboarding-query.dto';
import { SyncUserAccountDto } from '../../dto/sync-user-account.dto';
import { DEFAULT_THROTTLE_OPTIONS } from '../../../../shared/utils/constants';

@Controller('user-onboarding')
@ApiTags('user-onboarding')
export class UserOnboardingController {
  constructor(
    private readonly userOnboardingService: UserOnboardingService,
    private readonly userService: UserService,
  ) {}

  @Post('save-progress')
  @ApiOperation({
    summary: 'Save onboarding progress for new users (public endpoint)',
  })
  @Throttle({ default: { ...DEFAULT_THROTTLE_OPTIONS, limit: 10 } })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async saveOnboardingProgress(@Body() dto: UpdateOnboardingProgressDto) {
    return this.userOnboardingService.updateOnboardingProgress(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Restore onboarding progress for new users (public endpoint)',
  })
  @Throttle({ default: { ...DEFAULT_THROTTLE_OPTIONS, limit: 20 } })
  async restoreOnboardingProgress(@Query() query: GetUserOnboardingQueryDto) {
    return this.userOnboardingService.getOnboardingProgress(query);
  }

  @Post('create-user')
  @ApiOperation({
    summary: 'Create user and onboarding data for web platform (public endpoint)',
  })
  @Throttle({ default: { ...DEFAULT_THROTTLE_OPTIONS, limit: 5 } })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createUserWithOnboarding(@Body() dto: SyncUserAccountDto) {
    return this.userService.createUserWithOnboarding(dto);
  }
}
