import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { AccountabilityBuddy } from '../entities/accountability-buddy.entity';
import { InvitationStatus } from '../domain/invitation-status.enum';

@Injectable()
export class AccountabilityBuddyRepository extends BaseRepository<AccountabilityBuddy> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, AccountabilityBuddy);
  }

  async findByUserId(userId: string): Promise<AccountabilityBuddy[]> {
    return this.orm.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async findByIdAndUserId(buddyId: string, userId: string): Promise<AccountabilityBuddy | null> {
    return this.orm.findOne({
      where: { id: buddyId, user_id: userId },
    });
  }

  async findById(id: string): Promise<AccountabilityBuddy | null> {
    return this.orm.findOne({
      where: { id },
    });
  }

  async findPendingInvitations(): Promise<AccountabilityBuddy[]> {
    return this.orm.find({
      where: {
        invitation_status: InvitationStatus.PENDING,
      },
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.orm.delete(id);
  }

  async findByUserIdAndBuddyUserId(userId: string, buddyUserId: string): Promise<AccountabilityBuddy | null> {
    return this.orm.findOne({
      where: { user_id: userId, buddy_user_id: buddyUserId },
    });
  }

  async findByBuddyUserIdAndStatus(buddyUserId: string, status: InvitationStatus): Promise<AccountabilityBuddy[]> {
    return this.orm.find({
      where: { buddy_user_id: buddyUserId, invitation_status: status },
    });
  }
}
