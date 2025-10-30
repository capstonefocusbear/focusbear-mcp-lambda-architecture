import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as semver from 'semver';
import { AppVersionEntity } from '../entities/app-versions.entity';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';

export interface CreateAppVersionDto {
  operatingSystem: OperatingSystem;
  semverString: string;
  isSupported?: boolean;
  isBetaOnly?: boolean;
  releaseNotes?: string;
}

@Injectable()
export class AppVersionsRepository {
  constructor(
    @InjectRepository(AppVersionEntity)
    private readonly repository: Repository<AppVersionEntity>,
  ) {}

  /**
   * Find all versions for a given OS, optionally including beta versions
   */
  async findAllByOS(os: OperatingSystem, includeBeta: boolean): Promise<AppVersionEntity[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('app_version')
      .where('app_version.operatingSystem = :os', { os });

    if (!includeBeta) {
      queryBuilder.andWhere('app_version.isBetaOnly = :isBetaOnly', { isBetaOnly: false });
    }

    const versions = await queryBuilder.getMany();

    // Sort by SemVer descending (newest first)
    return versions.sort((a, b) => semver.rcompare(a.semverString, b.semverString));
  }

  /**
   * Find the latest version for a given OS
   * @param os Operating system
   * @param includeBeta Whether to include beta-only versions
   * @returns Latest version or null if none found
   */
  async findLatest(os: OperatingSystem, includeBeta: boolean): Promise<AppVersionEntity | null> {
    const versions = await this.findAllByOS(os, includeBeta);
    return versions.length > 0 ? versions[0] : null;
  }

  /**
   * Find the minimum supported version for a given OS
   * @param os Operating system
   * @returns Minimum supported version or null if none found
   */
  async findMinSupported(os: OperatingSystem): Promise<AppVersionEntity | null> {
    const versions = await this.repository.find({
      where: {
        operatingSystem: os,
        isSupported: true,
      },
    });

    if (versions.length === 0) {
      return null;
    }

    // Sort by SemVer ascending (oldest first)
    const sortedVersions = versions.sort((a, b) => semver.compare(a.semverString, b.semverString));

    return sortedVersions[0];
  }

  /**
   * Create a new app version record
   * @param dto Version data
   * @returns Created version entity
   */
  async createVersion(dto: CreateAppVersionDto): Promise<AppVersionEntity> {
    const version = this.repository.create({
      operatingSystem: dto.operatingSystem,
      semverString: dto.semverString,
      isSupported: dto.isSupported ?? false,
      isBetaOnly: dto.isBetaOnly ?? false,
      releaseNotes: dto.releaseNotes,
    });

    return this.repository.save(version);
  }

  /**
   * Find a version by ID
   */
  async findById(id: string): Promise<AppVersionEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Update a version's support status
   */
  async updateSupportStatus(id: string, isSupported: boolean): Promise<AppVersionEntity | null> {
    await this.repository.update(id, { isSupported });
    return this.findById(id);
  }

  /**
   * Update a version's beta status
   */
  async updateBetaStatus(id: string, isBetaOnly: boolean): Promise<AppVersionEntity | null> {
    await this.repository.update(id, { isBetaOnly });
    return this.findById(id);
  }
}
