import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { InvitationStatus } from '../domain/invitation-status.enum';
import { UnlockRequest } from './unlock-request.entity';

@Entity('accountability_buddy')
export class AccountabilityBuddy extends BaseEntity {
  constructor({ id, ...buddy }: Partial<AccountabilityBuddy> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...buddy });
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
    nullable: true,
  })
  buddy_user_id?: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    transformer: BaseEntity.encryptField('buddy_email'),
  })
  buddy_email?: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: InvitationStatus.PENDING,
  })
  invitation_status: InvitationStatus;

  @Column({
    type: 'timestamptz',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  invitation_sent_at?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  invitation_responded_at?: Date;

  @ManyToOne(() => User, (user) => user.accountability_buddies, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'buddy_user_id' })
  buddy?: User;

  @OneToMany(() => UnlockRequest, (unlockRequest) => unlockRequest.accountability_buddy)
  unlock_requests?: UnlockRequest[];
}
