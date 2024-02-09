import { Column, Entity, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { Activity } from './activity.entity';

@Entity('tutorials')
export class Tutorial extends BaseEntity {
  constructor({ id, ...data }: Partial<Tutorial> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Column({ type: 'varchar', length: 1000 })
  name: string;

  @Index()
  @Column({ type: 'varchar' })
  activity_id: string;

  @ManyToOne(() => Activity, (activity) => activity.tutorials, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_id' })
  activity?: Activity;
}
