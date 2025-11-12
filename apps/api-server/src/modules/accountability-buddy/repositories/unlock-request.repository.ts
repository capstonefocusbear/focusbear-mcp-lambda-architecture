import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { UnlockRequest } from '../entities/unlock-request.entity';
import { UnlockRequestStatus } from '../domain/unlock-request-status.enum';

@Injectable()
export class UnlockRequestRepository extends BaseRepository<UnlockRequest> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, UnlockRequest);
  }

  async findPendingByUserId(userId: string): Promise<UnlockRequest[]> {
    return this.orm.find({
      where: {
        user_id: userId,
        status: UnlockRequestStatus.PENDING,
      },
    });
  }

  async findMostRecentByUserId(userId: string): Promise<UnlockRequest | null> {
    return this.orm.findOne({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async findByIdWithRelations(id: string): Promise<UnlockRequest | null> {
    return this.orm.findOne({
      where: { id },
      relations: ['accountability_buddy'],
    });
  }

  async findById(id: string): Promise<UnlockRequest | null> {
    return this.orm.findOne({
      where: { id },
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<UnlockRequest | null> {
    return this.orm.findOne({
      where: { id, user_id: userId },
    });
  }

  async findByAccountabilityBuddyIds(buddyIds: string[], status: UnlockRequestStatus): Promise<UnlockRequest[]> {
    return this.orm.find({
      where: {
        accountability_buddy_id: In(buddyIds),
        status,
      },
      order: { created_at: 'DESC' },
    });
  }

  async findByUserId(userId: string): Promise<UnlockRequest[]> {
    return this.orm.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async findApprovedByUserId(userId: string): Promise<UnlockRequest[]> {
    return this.orm.find({
      where: {
        user_id: userId,
        status: UnlockRequestStatus.APPROVED,
      },
      order: { created_at: 'DESC' },
    });
  }
}
