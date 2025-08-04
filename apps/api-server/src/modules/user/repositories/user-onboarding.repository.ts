import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { OperatingSystem } from '@api-server/shared/domain/operating-system.enum';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { UserOnboarding } from '../entities/user-onboarding.entity';

@Injectable()
export class UserOnboardingRepository extends BaseRepository<UserOnboarding> {
  constructor(private readonly connection: Connection) {
    super(connection, UserOnboarding);
  }

  async findByUserIdAndOs(userId: string, os?: OperatingSystem): Promise<UserOnboarding | null> {
    const query = this.orm.createQueryBuilder('user_onboarding').where('user_onboarding.user_id = :userId', { userId });

    if (os !== undefined) {
      query.andWhere('user_onboarding.os = :os', { os });
    }

    return query.getOne();
  }
}
