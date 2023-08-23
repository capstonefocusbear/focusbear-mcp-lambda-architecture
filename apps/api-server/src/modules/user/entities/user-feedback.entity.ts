import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from './user.entity';
import { ColumnNumericTransformer } from '../../../shared/transformers/numeric-column-transformer';

@Entity('user_feedback')
export class UserFeedback extends BaseEntity {
  constructor({ id, ...userFeedback }: Partial<UserFeedback> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...userFeedback });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'numeric',
    nullable: false,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  rating?: number;

  @Column({
    type: 'varchar',
    length: 2500,
    nullable: true,
  })
  feedback?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata?: any;

  @ManyToOne(() => User, (user) => user.feedback, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
