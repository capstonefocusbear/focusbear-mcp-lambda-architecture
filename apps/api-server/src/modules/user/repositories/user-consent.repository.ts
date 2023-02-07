import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { UserConsent } from '../entities/user-consent.entity';

@Injectable()
export class UserConsentRepository extends BaseRepository<UserConsent> {
  constructor(private readonly connection: Connection) {
    super(connection, UserConsent);
  }
}
