import { Controller, Get, Post, Body, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { IsAdmin } from '../../auth/guards/is-admin/is-admin.guard';
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
    description: 'Retrieve latest app version for specific operating system',
  })
  @ApiResponse({ status: 200, description: 'Latest version information', type: LatestAppVersionResponseDto })
  async getLatestAppVersion(@Query() query: GetLatestAppVersionQueryDto): Promise<LatestAppVersionResponseDto> {
    const normalizedOs = query.os_name.trim().toLowerCase();

    // Map os_name to OperatingSystem enum (case-insensitive)
    const osMap: Record<string, OperatingSystem> = {
      ios: OperatingSystem.iOS,
      android: OperatingSystem.Android,
      mac: OperatingSystem.MacOS,
      macos: OperatingSystem.MacOS,
      windows: OperatingSystem.Windows,
      web: OperatingSystem.Web,
      unknown: OperatingSystem.Unknown,
    };

    const os = osMap[normalizedOs];
    if (!os) {
      throw new BadRequestException(
        `Invalid operating system: ${query.os_name}. Must be one of: iOS, Android, MacOS, Windows`,
      );
    }

    return this.appVersionsService.getLatestVersion(os, query.is_beta);
  }

  @Post('create-version')
  @UseGuards(IsAuth, IsAdmin) // Add this guard
  @ApiBearerAuth() // Add this for Swagger documentation
  @ApiOperation({ summary: 'Create new app version (CI/CD)' })
  @ApiResponse({ status: 201, description: 'Version created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createAppVersion(@Body() createAppVersionDto: CreateAppVersionDto) {
    return this.appVersionsService.createVersion(createAppVersionDto);
  }
}
