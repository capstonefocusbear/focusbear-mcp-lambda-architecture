import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { DeviceMetadata } from '../domain/device-metadata.model';
import { OperatingSystem } from '../domain/operating-system.enum';

@Entity('devices')
export class Device extends BaseEntity {
  constructor({ id, ...device }: Partial<Device> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...device, is_leader: !!device.is_leader });
  }

  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'enum',
    enum: OperatingSystem,
    nullable: false,
  })
  operating_system?: OperatingSystem;

  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
  })
  is_leader?: boolean;

  @Column({
    type: 'jsonb',
    transformer: BaseEntity.encryptJSONField('metadata'),
  })
  metadata?: DeviceMetadata;

  @ManyToOne(() => User, (user) => user.activity_sequences)
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
