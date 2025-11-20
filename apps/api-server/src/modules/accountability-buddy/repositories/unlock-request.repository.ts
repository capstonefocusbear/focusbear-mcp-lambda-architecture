import { Injectable } from '@nestjs/common';
import { DataSource, In, FindOptionsWhere } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { UnlockRequest } from '../entities/unlock-request.entity';
import { UnlockRequestStatus } from '../domain/unlock-request-status.enum';
import { UnlockRequestRole } from '../domain/unlock-request-role.enum';
import { PageOrder } from '../../../shared/domain/page-order.enum';

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

  async findByAccountabilityBuddyIds(buddyIds: string[], status?: UnlockRequestStatus): Promise<UnlockRequest[]> {
    const where: FindOptionsWhere<UnlockRequest> = {
      accountability_buddy_id: In(buddyIds),
    };
    if (status) {
      where.status = status;
    }
    return this.orm.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async findByUserId(userId: string): Promise<UnlockRequest[]> {
    return this.orm.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async findCombinedUnlockRequests(
    userId: string,
    relationshipIds: string[],
    filters: {
      status?: UnlockRequestStatus;
      role?: UnlockRequestRole;
      created_from?: string;
      created_to?: string;
    },
    pagination: {
      skip: number;
      take: number;
      order: PageOrder;
    },
  ): Promise<[UnlockRequest[], number]> {
    const queryBuilder = this.orm.createQueryBuilder('unlock_request');

    queryBuilder.leftJoinAndSelect('unlock_request.user', 'user');

    if (filters.role === UnlockRequestRole.SENT) {
      queryBuilder.where('unlock_request.user_id = :userId', { userId });
    } else if (filters.role === UnlockRequestRole.RECEIVED) {
      if (relationshipIds.length > 0) {
        queryBuilder.where('unlock_request.accountability_buddy_id IN (:...relationshipIds)', {
          relationshipIds,
        });
      } else {
        // If no relationships, return empty result
        queryBuilder.where('1 = 0');
      }
    } else if (relationshipIds.length > 0) {
      // No role filter: fetch both sent and received (default behavior)
      queryBuilder.where(
        '(unlock_request.user_id = :userId OR unlock_request.accountability_buddy_id IN (:...relationshipIds))',
        { userId, relationshipIds },
      );
    } else {
      // No role filter and no relationships: only fetch sent requests
      queryBuilder.where('unlock_request.user_id = :userId', { userId });
    }

    if (filters.status) {
      queryBuilder.andWhere('unlock_request.status = :status', { status: filters.status });
    }

    if (filters.created_from) {
      queryBuilder.andWhere('unlock_request.created_at >= :created_from', {
        created_from: filters.created_from,
      });
    }

    if (filters.created_to) {
      queryBuilder.andWhere('unlock_request.created_at <= :created_to', {
        created_to: filters.created_to,
      });
    }

    const orderDirection = pagination.order === PageOrder.ASC ? 'ASC' : 'DESC';
    queryBuilder.orderBy('unlock_request.created_at', orderDirection);

    queryBuilder.skip(pagination.skip);
    queryBuilder.take(pagination.take);

    return queryBuilder.getManyAndCount();
  }
}
