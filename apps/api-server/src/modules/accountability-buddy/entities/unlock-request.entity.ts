import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { AccountabilityBuddy } from './accountability-buddy.entity';
import { UnlockRequestStatus } from '../domain/unlock-request-status.enum';

@Entity('unlock_requests')
export class UnlockRequest extends BaseEntity {
  constructor({ id, ...request }: Partial<UnlockRequest> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...request });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  accountability_buddy_id: string;

  @Column({
    type: 'text',
    nullable: true,
    transformer: BaseEntity.encryptField('reason'),
  })
  reason?: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: UnlockRequestStatus.PENDING,
  })
  status: UnlockRequestStatus;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  approved_at?: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => AccountabilityBuddy, (buddy) => buddy.unlock_requests, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'accountability_buddy_id' })
  accountability_buddy?: AccountabilityBuddy;
}
