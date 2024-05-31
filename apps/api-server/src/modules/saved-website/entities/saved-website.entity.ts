import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';

@Entity('saved_websites_for_relax_block')
export class SavedWebsite extends BaseEntity {
  constructor({ id, ...urlData }: Partial<SavedWebsite> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...urlData });
  }

  @Index()
  @Column({ type: 'uuid', nullable: false })
  user_id: string;

  @Column({ type: 'varchar', nullable: false, transformer: BaseEntity.encryptField('url') })
  url: string;

  @Column({ type: 'varchar', nullable: true, transformer: BaseEntity.encryptField('title') })
  title?: string;

  @Column({ type: 'jsonb', default: null, nullable: true })
  metadata: any;

  @Column({ type: 'varchar', nullable: true, transformer: BaseEntity.encryptField('note') })
  note?: string;

  @ManyToOne(() => User, (user) => user.saved_websites, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
