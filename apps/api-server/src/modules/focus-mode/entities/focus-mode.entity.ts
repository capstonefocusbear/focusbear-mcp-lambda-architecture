import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { CompletedFocusBlock } from './completed-focus-block.entity';

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

  @Column({
    type: 'jsonb',
    transformer: BaseEntity.encrypteJSONField('metadata'),
  })
  metadata?: any;

  @DeleteDateColumn()
  deleted_at?: Date;

  @ManyToOne(() => User, (user) => user.activity_sequences)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToMany(() => CompletedFocusBlock, (log) => log.focus_mode)
  completed_logs?: CompletedFocusBlock[];
}
