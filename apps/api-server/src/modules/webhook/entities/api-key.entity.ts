import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';

@Entity('api_keys')
export class ApiKey extends BaseEntity {
  constructor(apiKey: Partial<ApiKey> = {}) {
    super(apiKey.id);
    Object.assign(this, apiKey);
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: false,
    unique: true,
  })
  key_hash: string;

  @Column({
    type: 'varchar',
    length: 8,
    nullable: false,
  })
  key_prefix: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  expires_at?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  last_used_at?: Date;

  @Column({
    type: 'boolean',
    default: true,
  })
  is_active: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
