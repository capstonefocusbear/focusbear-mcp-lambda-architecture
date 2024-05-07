import { Column, Entity, JoinColumn, Index, OneToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { Activity } from './activity.entity';
import { User } from '../../user/entities/user.entity';
import { ActivityTemplate } from '../../activity-template/entity/activity-template.entity';

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

  @Index()
  @Column({
    type: 'uuid',
    nullable: true,
  })
  activity_template_id?: string;

  @OneToOne(() => Activity, (activity) => activity.tutorial, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_id' })
  activity?: Activity;

  @OneToMany(() => User, (user) => user.tutorials)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToOne(() => ActivityTemplate, (activityTemplate) => activityTemplate.tutorial, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_template_id' })
  activity_template?: ActivityTemplate;
}
