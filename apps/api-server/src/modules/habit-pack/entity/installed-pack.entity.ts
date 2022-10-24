import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { HabitPack } from './habit-pack.entity';

@Entity('installed_packs')
export class InstalledPack extends BaseEntity {
  constructor({ id, ...installData }: Partial<InstalledPack> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...installData });
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
  pack_id?: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  installation_status?: boolean;

  @Column({
    type: 'uuid',
  })
  activity_sequence_id?: string;

  @ManyToOne(() => User, (user) => user.installed_packs)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => HabitPack, (habit_pack) => habit_pack.installs)
  @JoinColumn({ name: 'pack_id' })
  habit_pack?: HabitPack;
}
