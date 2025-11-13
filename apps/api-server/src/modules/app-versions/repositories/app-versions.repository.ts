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
   * @param os Operating system
   * @returns All versions exists for given OS
   */
  async findAllByOS(os: OperatingSystem): Promise<AppVersionEntity[]> {
    const versions = await this.orm
      .createQueryBuilder('app_versions')
      .where('app_versions.operating_system = :os', { os })
      .getMany();

    // Sort by SemVer descending (newest first)
    return versions.sort((a, b) => semver.rcompare(a.semver_string, b.semver_string));
  }

  /**
   * Find the latest version for a given OS
   * @param os Operating system
   * @param includeBeta Whether to include beta-only versions
   * @returns Latest version or null if none found
   */
  async findLatest(os: OperatingSystem, includeBeta: boolean): Promise<AppVersionEntity | null> {
    const queryBuilder = this.orm
      // Query for no beta
      .createQueryBuilder('app_version')
      .where('app_version.operating_system = :os', { os })
      .andWhere('app_version.is_supported = true');

    // Query for include beta
    if (includeBeta) {
      queryBuilder
        .orWhere('app_version.is_beta_only = :includeBeta', { includeBeta })
        .andWhere('app_version.operating_system = :os', { os });
    }

    const versions = await queryBuilder.getMany();

    if (versions.length === 0) {
      return null;
    }
    // Sort by SemVer descending (newest first)
    return versions.sort((a, b) => semver.rcompare(a.semver_string, b.semver_string))[0];
  }

  /**
   * Find the minimum supported version for a given OS
   * @param os Operating system
   * @returns Minimum supported version or null if none found
   */
  async findMinSupported(os: OperatingSystem): Promise<AppVersionEntity | null> {
    const queryBuilder = await this.orm
      .createQueryBuilder('app_version')
      .where('app_version.operating_system = :os', { os })
      .andWhere('app_version.is_supported = true');

    const versions = await queryBuilder.getMany();

    // Sort by SemVer ascending (oldest first)
    return versions.sort((a, b) => semver.compare(a.semver_string, b.semver_string))[0];
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
