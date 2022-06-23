import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';

@Entity('completed_focus_blocks')
export class CompletedFocusBlock extends BaseEntity {
  constructor({ id, ...data }: Partial<CompletedFocusBlock> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data, is_finished: !!data.finish_time });
  }

  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  focus_mode_id?: string;

  @Column({
    type: 'timestamp',
  })
  start_time?: Date;

  @Column({
    type: 'timestamp',
  })
  finish_time?: Date;

  @Column({
    type: 'timestamp',
  })
  scheduled_finish_time?: Date;

  @Column({
    type: 'varchar',
    length: 255,
    transformer: BaseEntity.encrypteField('intention'),
  })
  intention?: string;

  @Column({
    type: 'varchar',
    length: 255,
    transformer: BaseEntity.encrypteField('achievements'),
  })
  achievements?: string;

  @Column({
    type: 'varchar',
    length: 255,
    transformer: BaseEntity.encrypteField('distractions'),
  })
  distractions?: string;

  @ManyToOne(() => User, (user) => user.activity_sequences)
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
