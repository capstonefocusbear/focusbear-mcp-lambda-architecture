import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { UserOnboarding } from '../entities/user-onboarding.entity';

@Injectable()
export class UserOnboardingRepository extends BaseRepository<UserOnboarding> {
  constructor(private readonly connection: Connection) {
    super(connection, UserOnboarding);
  }

  async findByAuth0Id(auth0Id: string): Promise<UserOnboarding | null> {
    return this.orm.findOne({ where: { auth0_id: auth0Id } });
  }
}
