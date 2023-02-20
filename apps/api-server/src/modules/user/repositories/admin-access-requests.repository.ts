import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { AdminAccessRequest } from '../entities/admin-access-requests.entity';

@Injectable()
export class AdminAccessRequestRepository extends BaseRepository<AdminAccessRequest> {
  constructor(private readonly connection: Connection) {
    super(connection, AdminAccessRequest);
  }
}
