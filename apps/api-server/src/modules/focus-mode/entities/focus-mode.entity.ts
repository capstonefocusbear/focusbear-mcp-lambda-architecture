import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';

@Entity('focus_modes')
export class FocusMode extends BaseEntity {
  constructor({ id, ...data }: Partial<FocusMode> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    transformer: BaseEntity.encrypteField('name'),
  })
  name?: string;

  @Column({
    type: 'jsonb',
    transformer: BaseEntity.encrypteJSONField('allowed_apps'),
  })
  allowed_apps?: string[];

  @Column({
    type: 'jsonb',
    transformer: BaseEntity.encrypteJSONField('allowed_urls'),
  })
  allowed_urls?: string[];

  @ManyToOne(() => User, (user) => user.activity_sequences)
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
