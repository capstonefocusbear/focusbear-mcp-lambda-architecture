import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { ActivityType } from '../domain/activity-type.enum';
import { User } from '../../user/entities/user.entity';
import { Activity } from './activity.entity';
import { ComplitedActivity } from './complited-activity.entity';

@Entity('activity_sequences')
export class ActivitySequence extends BaseEntity {
  constructor({ id, ...sequence }: Partial<ActivitySequence> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...sequence });
  }

  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
    nullable: false,
  })
  type?: ActivityType;

  @Column({
    type: 'jsonb',
    nullable: false,
    transformer: BaseEntity.encrypteJSONField('activity_ids'),
  })
  activity_ids?: string[];

  @ManyToOne(() => User, (user) => user.activity_sequences)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToMany(() => Activity, (activity) => activity.activity_sequence)
  activities?: Activity[];

  @OneToMany(() => ComplitedActivity, (complited) => complited.activity_secuence)
  complited_activities?: ComplitedActivity[];
}
