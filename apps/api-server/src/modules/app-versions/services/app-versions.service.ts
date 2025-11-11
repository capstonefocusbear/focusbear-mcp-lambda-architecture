import { Injectable, BadRequestException } from '@nestjs/common';
import * as semver from 'semver';
import { AppVersionsRepository } from '../repositories/app-versions.repository';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';
import { CreateAppVersionDto } from '../dto/create-app-version.dto';
import { LatestAppVersionResponseDto } from '../dto/latest-app-version-response.dto';

@Injectable()
export class AppVersionsService {
  constructor(private readonly appVersionsRepository: AppVersionsRepository) {}

  /**
   * Get latest app version information for a given OS
   */
  async getLatestVersion(os: OperatingSystem, includeBeta = false): Promise<LatestAppVersionResponseDto> {
    const [latest, minSupported] = await Promise.all([
      this.appVersionsRepository.findLatest(os, includeBeta),
      this.appVersionsRepository.findMinSupported(os),
    ]);

    return {
      minimum_supported_app_version: minSupported?.semver_string ?? null,
      latest_app_version: latest?.semver_string ?? null,
      release_notes: latest?.release_notes ?? null,
    };
  }

  /**
   * Create a new app version (used by CI/CD)
   */
  async createVersion(dto: CreateAppVersionDto) {
    // Validate semver format
    if (!semver.valid(dto.semver_string)) {
      throw new BadRequestException(`Invalid semantic version: ${dto.semver_string}`);
    }

    // Check if version already exists for this OS
    const existing = await this.appVersionsRepository.findAllByOS(dto.operating_system, true);
    const duplicate = existing.find((v) => v.semver_string === dto.semver_string);

    if (duplicate) {
      throw new BadRequestException(`Version ${dto.semver_string} already exists for ${dto.operating_system}`);
    }

    // Map DTO to repository format
    return this.appVersionsRepository.createVersion({
      operating_system: dto.operating_system,
      semver_string: dto.semver_string,
      is_supported: dto.is_supported,
      is_beta_only: dto.is_beta_only,
      release_notes: dto.release_notes,
    });
  }
}
