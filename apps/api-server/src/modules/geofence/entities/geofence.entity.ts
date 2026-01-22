import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { ActivitySequence } from '../../activity/entities/activity-sequence.entity';

@Entity('geofences')
export class Geofence extends BaseEntity {
  constructor({ id, ...geofenceData }: Partial<Geofence> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...geofenceData });
  }

  @Index()
  @Column({ type: 'uuid', nullable: false })
  user_id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({
    type: 'varchar',
    nullable: false,
    transformer: BaseEntity.encryptField('geofence_latitude'),
  })
  latitude: string;

  @Column({
    type: 'varchar',
    nullable: false,
    transformer: BaseEntity.encryptField('geofence_longitude'),
  })
  longitude: string;

  @Column({ type: 'integer', default: 100 })
  radius: number;

  @Column({ type: 'time', nullable: true })
  trigger_after_time?: string;

  @Column({ type: 'uuid', nullable: true })
  associated_routine_id?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => ActivitySequence, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'associated_routine_id' })
  associated_routine?: ActivitySequence;
}
