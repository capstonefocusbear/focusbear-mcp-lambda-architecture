import { Column, Entity, JoinColumn, Index, OneToOne, ManyToOne } from 'typeorm';
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
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_id' })
  activity?: Activity;

  @OneToOne(() => User, (user) => user.tutorial)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ActivityTemplate, (activityTemplate) => activityTemplate.tutorials, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_template_id' })
  activity_template?: ActivityTemplate;
}
