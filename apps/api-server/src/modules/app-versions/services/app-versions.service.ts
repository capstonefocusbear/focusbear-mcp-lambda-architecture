import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import * as semver from 'semver';
import { AppVersionsRepository } from '../repositories/app-versions.repository';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';
import { CreateAppVersionDto } from '../dto/create-app-version.dto';
import { LatestAppVersionResponseDto } from '../dto/latest-app-version-response.dto';

@Injectable()
export class AppVersionsService {
  constructor(private readonly appVersionsRepository: AppVersionsRepository) {}

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

  async createVersion(dto: CreateAppVersionDto) {
    if (!semver.valid(dto.semver_string)) {
      throw new BadRequestException(`Invalid semantic version: ${dto.semver_string}`);
    }

    try {
      return await this.appVersionsRepository.createVersion({
        operating_system: dto.operating_system,
        semver_string: dto.semver_string,
        is_supported: dto.is_supported,
        is_beta_only: dto.is_beta_only,
        release_notes: dto.release_notes,
      });
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(`Version ${dto.semver_string} already exists for ${dto.operating_system}`);
      }
      throw error;
    }
  }
}
