import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import * as semver from 'semver';
import { AppVersionEntity } from '../entities/app-versions.entity';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';

export interface CreateAppVersionDto {
  operating_system: OperatingSystem;
  semver_string: string;
  is_supported?: boolean;
  is_beta_only?: boolean;
  release_notes?: string;
}

@Injectable()
export class AppVersionsRepository extends BaseRepository<AppVersionEntity> {
  constructor(private readonly connection: Connection) {
    super(connection, AppVersionEntity);
  }

  /**
   * Find all versions for a given OS, optionally including beta versions
   */
  async findAllByOS(os: OperatingSystem, includeBeta: boolean): Promise<AppVersionEntity[]> {
    const queryBuilder = this.orm
      .createQueryBuilder('app_versions')
      .where('app_versions.operating_system = :os', { os });

    // Only include non-beta versions when includeBeta is false
    if (!includeBeta) {
      queryBuilder.andWhere('app_versions.is_beta_only = :includeBeta', { includeBeta });
    }

    const versions = await queryBuilder.getMany();

    // Sort by SemVer descending (newest first)
    return versions.sort((a, b) => semver.rcompare(a.semver_string, b.semver_string));
  }

  /**
   * Find the latest version for a given OS
   * @param os Operating system
   * @param includeBeta Whether to include beta-only versions
   * @returns Latest version or null if none found
   */
  // async findLatest(os: OperatingSystem, includeBeta: boolean): Promise<AppVersionEntity | null> {
  //   const queryBuilder = this.orm
  //     .createQueryBuilder('app_version')
  //     .where('app_version.operating_system = :os', { os })
  //     .andWhere('app_version.is_supported = :isSupported', { isSupported: true })
  //     .andWhere('app_version.is_beta_only = :is_beta_only', { is_beta_only: includeBeta });

  //   if (!queryBuilder) return null;
  //   return queryBuilder.orderBy('app_version.created_at', 'DESC').getOne();
  // }

  async findLatest(os: OperatingSystem, includeBeta: boolean): Promise<AppVersionEntity | null> {
    const queryBuilder = this.orm
      .createQueryBuilder('app_version')
      .where('app_version.operating_system = :os', { os })
      .andWhere('app_version.is_supported = true');
    // .orWhere('app_version.is_beta_only = :includeBeta', { includeBeta })
    // .orderBy('app_version.semver_string', 'DESC');

    /**
     * ✅ Handle beta inclusion logic
     *
     * - If includeBeta = false → exclude beta-only builds
     * - If includeBeta = true  → include all builds (no extra filter)
     */
    if (includeBeta) {
      queryBuilder.orWhere('app_version.is_beta_only = :includeBeta', { includeBeta });
    }

    /**
     * ⚙️ Optional: filter only supported versions
     * Uncomment if your rule says "latest must be supported"
     *
     * queryBuilder.andWhere('app_version.is_supported = :isSupported', { isSupported: true });
     */

    /**
     * 🕒 Order newest first
     * - Using created_at DESC is fine if you always insert newer versions later.
     * - For more accuracy, use semver sorting in JS after fetching.
     */
    queryBuilder.orderBy('app_version.semver_string', 'DESC');

    // Execute query — get the first (newest) matching version
    const latestVersion = await queryBuilder.getOne();

    // If no version found, return null
    if (!latestVersion) {
      return null;
    }

    return latestVersion;
  }

  /**
   * Find the minimum supported version for a given OS
   * @param os Operating system
   * @returns Minimum supported version or null if none found
   */
  async findMinSupported(os: OperatingSystem): Promise<AppVersionEntity | null> {
    const versions = await this.orm.find({
      where: {
        operating_system: os,
        is_supported: true,
      },
    });

    if (versions.length === 0) {
      return null;
    }

    // Sort by SemVer ascending (oldest first)
    const sortedVersions = versions.sort((a, b) => semver.compare(a.semver_string, b.semver_string));

    return sortedVersions[0];
  }

  /**
   * Create a new app version record
   * @param dto Version data
   * @returns Created version entity
   */
  async createVersion(dto: CreateAppVersionDto): Promise<AppVersionEntity> {
    const version = this.orm.create({
      operating_system: dto.operating_system,
      semver_string: dto.semver_string,
      is_supported: dto.is_supported ?? false,
      is_beta_only: dto.is_beta_only ?? false,
      release_notes: dto.release_notes,
    });

    return this.orm.save(version);
  }
}
