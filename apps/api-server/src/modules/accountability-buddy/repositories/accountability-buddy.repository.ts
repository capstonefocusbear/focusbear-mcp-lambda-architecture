import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { AccountabilityBuddy } from '../entities/accountability-buddy.entity';
import { InvitationStatus } from '../domain/invitation-status.enum';

@Injectable()
export class AccountabilityBuddyRepository extends BaseRepository<AccountabilityBuddy> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, AccountabilityBuddy);
  }

  async findBuddiesByUserId(userId: string, status?: InvitationStatus): Promise<AccountabilityBuddy[]> {
    const where: FindOptionsWhere<AccountabilityBuddy> = { user_id: userId };
    if (status) {
      where.invitation_status = status;
    }
    return this.orm.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async findBuddyById(id: string): Promise<AccountabilityBuddy | null> {
    return this.orm.findOne({
      where: { id },
    });
  }

  async findBuddiesPendingInvitations(buddyUserId?: string): Promise<AccountabilityBuddy[]> {
    return this.orm.find({
      where: {
        invitation_status: InvitationStatus.PENDING,
        buddy_user_id: buddyUserId,
      },
    });
  }

  async deleteBuddyById(id: string): Promise<void> {
    await this.orm.delete(id);
  }

  async findUserBuddy(userId: string, buddyUserId: string): Promise<AccountabilityBuddy | null> {
    return this.orm.findOne({
      where: { user_id: userId, buddy_user_id: buddyUserId },
    });
  }

  async findBuddiesByUserIdAndStatus(userId: string, status: InvitationStatus): Promise<AccountabilityBuddy[]> {
    return this.orm.find({
      where: { user_id: userId, invitation_status: status },
    });
  }

  async findByBuddyUserId(buddyUserId: string, status?: InvitationStatus): Promise<AccountabilityBuddy[]> {
    const where: FindOptionsWhere<AccountabilityBuddy> = { buddy_user_id: buddyUserId };
    if (status) {
      where.invitation_status = status;
    }
    return this.orm.find({
      where,
      order: { created_at: 'DESC' },
    });
  }
}
