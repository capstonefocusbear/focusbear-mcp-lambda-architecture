import { Body, Controller, Get, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserOnboardingService } from '../../services/user-onboarding/user-onboarding.service';
import { UpdateOnboardingProgressDto } from '../../dto/onboarding/update-onboarding-progress.dto';
import { GetUserOnboardingQueryDto } from '../../dto/onboarding/get-user-onboarding-query.dto';

@Controller('user-onboarding')
@ApiTags('user-onboarding')
export class UserOnboardingController {
  constructor(private readonly userOnboardingService: UserOnboardingService) {}

  @Post()
  @ApiOperation({
    summary: 'Save onboarding progress for new users (public endpoint)',
    description: 'Stores onboarding data using user_id before user gets access token',
  })
  @Throttle({ default: { ttl: 60, limit: 10 } })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async saveOnboardingProgress(@Body() dto: UpdateOnboardingProgressDto) {
    return this.userOnboardingService.updateOnboardingProgress(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Restore onboarding progress for new users (public endpoint)',
    description: 'Retrieves stored onboarding data using user_id',
  })
  @Throttle({ default: { ttl: 60, limit: 20 } })
  async restoreOnboardingProgress(@Query() query: GetUserOnboardingQueryDto) {
    return this.userOnboardingService.getOnboardingProgress(query);
  }
}
