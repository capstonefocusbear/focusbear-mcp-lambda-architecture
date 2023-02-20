import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from './user.entity';

@Entity('admin_access_requests')
export class AdminAccessRequest extends BaseEntity {
  constructor({ id, ...user }: Partial<AdminAccessRequest> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...user });
  }

  @Column({
    type: 'uuid',
    nullable: false,
  })
  admin_user_id?: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  access_reason: string;

  @ManyToOne(() => User, (user) => user.consents)
  @JoinColumn({ name: 'admin_user_id' })
  user?: User;
}
