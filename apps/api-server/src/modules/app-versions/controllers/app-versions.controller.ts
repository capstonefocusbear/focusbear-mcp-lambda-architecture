import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppVersionsService } from '../services/app-versions.service';
import { LatestAppVersionResponseDto } from '../dto/latest-app-version-response.dto';
import { CreateAppVersionDto } from '../dto/create-app-version.dto';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';
import { GetLatestAppVersionQueryDto } from '../dto/get-latest-app-version.dto';

@Controller('app-versions')
@ApiTags('app-versions')
export class AppVersionsController {
  constructor(private readonly appVersionsService: AppVersionsService) {}

  @Get('latest')
  @ApiOperation({
    summary: 'Get latest app version',
    description: 'Retrieve lastest app version for specific operating system',
  })
  @ApiResponse({ status: 200, description: 'Latest version information', type: LatestAppVersionResponseDto })
  async getLatestAppVersion(@Query() query: GetLatestAppVersionQueryDto): Promise<LatestAppVersionResponseDto> {
    // Map os_name to OperatingSystem enum
    const osMap: Record<string, OperatingSystem> = {
      ios: OperatingSystem.iOS,
      iOS: OperatingSystem.iOS,
      android: OperatingSystem.Android,
      Android: OperatingSystem.Android,
      mac: OperatingSystem.MacOS,
      macos: OperatingSystem.MacOS,
      MacOS: OperatingSystem.MacOS,
      windows: OperatingSystem.Windows,
      Windows: OperatingSystem.Windows,
    };

    const os = osMap[query.os_name];
    if (!os) {
      throw new BadRequestException(
        `Invalid operating system: ${query.os_name}. Must be one of: iOS, Android, MacOS, Windows`,
      );
    }

    return this.appVersionsService.getLatestVersion(os, query.is_beta);
  }

  @Post('create-version')
  @ApiOperation({ summary: 'Create new app version (CI/CD)' })
  @ApiResponse({ status: 201, description: 'Version created successfully' })
  async createAppVersion(@Body() createAppVersionDto: CreateAppVersionDto) {
    return this.appVersionsService.createVersion(createAppVersionDto);
  }
}
