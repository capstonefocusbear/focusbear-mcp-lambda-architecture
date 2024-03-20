import { BaseEntity } from '../../../../apps/api-server/src/shared/entities/base-entity.entity';
import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { User } from '../../../../apps/api-server/src/modules/user/entities/user.entity';

@Entity('feedbacks')
export class Feedback extends BaseEntity {
  constructor({ id, ...data }: Partial<Feedback> = {}, options = { generateId: true }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Column({
    type: 'varchar',
  })
  cancel_subscription_reason: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id: string;

  @OneToOne(() => User, (user) => user.cancel_subscription_feedback, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
