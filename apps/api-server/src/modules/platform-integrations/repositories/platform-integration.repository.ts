import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { PlatformIntegration } from '../entities/platform-integration.entity';

@Injectable()
export class PlatformIntegrationRepository extends BaseRepository<PlatformIntegration> {
  constructor(private readonly connection: Connection) {
    super(connection, PlatformIntegration);
  }
}
