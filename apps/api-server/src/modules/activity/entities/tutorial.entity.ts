import { Column, Entity, JoinColumn, Index, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { Activity } from './activity.entity';
import { User } from '../../user/entities/user.entity';

@Entity('tutorials')
export class Tutorial extends BaseEntity {
  constructor({ id, ...data }: Partial<Tutorial> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Index()
  @Column({ type: 'varchar' })
  activity_id: string;

  @Index()
  @Column({ type: 'varchar' })
  user_id: string;

  @OneToOne(() => Activity, (activity) => activity.tutorial, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_id' })
  activity?: Activity;

  @OneToOne(() => User, (user) => user.tutorial)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
