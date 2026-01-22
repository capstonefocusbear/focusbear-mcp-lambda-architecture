import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { GetUserSettingsQueryDto } from '../../dto/get-user-settings-query.dto';
import { UpdateUserSettingsDto } from '../../dto/update-user-settings.dto';
import { UserSettingsService } from '../../services/user-settings/user-settings.service';
import { UpdateSettingsQueryDto } from '../../dto/update-settings-query.dto';
import { emitUserActivityMetric } from '../../../../../../../libs/observability/src/embedded-metrics.helper';
import { MetricsConfig } from '../../../../config/metrics.config';

@Controller('user-settings')
@UseGuards(IsAuth)
@ApiTags('user-settings')
@ApiSecurity('Auth0AccessToken')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService, private readonly config: ConfigService) {}

  private getMetricsConfig(): MetricsConfig {
    return (
      this.config.get<MetricsConfig>('metrics') || {
        emitQueueMetrics: true,
        emitUserActivityMetrics: true,
        pollIntervalMs: 60_000,
        namespace: 'FocusBear/API',
        service: 'api',
        environment: 'prod',
        logQueueFailures: true,
      }
    );
  }

  private async emitMetric(operation: string, durationMs: number, success: boolean, userId: string): Promise<void> {
    const metrics = this.getMetricsConfig();
    const shouldEmitMetrics = metrics.emitUserActivityMetrics ?? metrics.emitQueueMetrics ?? true;
    if (!shouldEmitMetrics) {
      return;
    }

    try {
      await emitUserActivityMetric({
        namespace: metrics.namespace,
        environment: metrics.environment,
        service: metrics.service,
        operation,
        durationMs,
        success,
        userId,
      });
    } catch (error) {
      // Silently fail - don't let metrics emission block the response
      console.error('Failed to emit user-settings metric', error);
    }
  }

  @Get()
  async getSettings(
    @Query() { timezone, language }: GetUserSettingsQueryDto,
    @AuthContext() { user }: Passport,
  ): Promise<UpdateUserSettingsDto> {
    // start metric timing
    const startTime = Date.now();

    try {
      const result = await this.userSettingsService.getSettings({ user_id: user.id, timezone, language });
      const durationMs = Date.now() - startTime;
      await this.emitMetric('getSettings', durationMs, true, user.id);
      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      await this.emitMetric('getSettings', durationMs, false, user.id);
      throw error;
    }
  }

  @Put()
  async updateSettings(
    @AuthContext() { user }: Passport,
    @Query() { is_onboarding, device_id }: UpdateSettingsQueryDto,
    @Body() updateSettingsData: UpdateUserSettingsDto,
  ) {
    // start metric timing
    const startTime = Date.now();
    try {
      const result = await this.userSettingsService.updateSettings({ user_id: user.id }, updateSettingsData, true, {
        is_onboarding,
        device_id,
      });
      const durationMs = Date.now() - startTime;
      await this.emitMetric('updateSettings', durationMs, true, user.id);
      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      await this.emitMetric('updateSettings', durationMs, false, user.id);
      throw error;
    }
  }
}
