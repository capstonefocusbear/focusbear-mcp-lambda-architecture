import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { DeviceMetadata } from '../domain/device-metadata.model';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';

@Entity('devices')
export class Device extends BaseEntity {
  constructor({ id, ...device }: Partial<Device> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...device, is_leader: !!device.is_leader });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Index()
  @Column({
    type: 'enum',
    enum: OperatingSystem,
    nullable: false,
  })
  operating_system?: OperatingSystem;

  @Index()
  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
  })
  is_leader?: boolean;

  @Index()
  @Column({
    type: 'varchar',
    nullable: true,
  })
  app_version?: string;

  @Column({
    type: 'jsonb',
    transformer: BaseEntity.encryptJSONField('metadata'),
  })
  metadata?: DeviceMetadata;

  @ManyToOne(() => User, (user) => user.devices, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
