import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { ImpactCategory } from '../../activity/domain/impact-category.enum';
import { ColumnNumericTransformer } from '../../../shared/transformers/numeric-column-transformer';

@Entity('impact_events')
export class ImpactEvent extends BaseEntity {
  constructor({ id, ...event }: Partial<ImpactEvent> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...event });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'enum',
    name: 'impact_category',
    enum: ImpactCategory,
    nullable: true,
    default: null,
  })
  impact_category?: ImpactCategory;

  @Column({
    type: 'numeric',
    nullable: true,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  minutes?: number;

  @ManyToOne(() => User, (user) => user.impact_events, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
