import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { FieldTransformer } from '../../../shared/utils/helpers';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';

@Entity('platform_integrations')
export class PlatformIntegration extends BaseEntity {
  constructor({ id, ...platformData }: Partial<PlatformIntegration> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...platformData });
  }

  @Column({
    type: 'uuid',
    nullable: false,
    unique: false,
  })
  user_id?: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  platform?: string;

  @Column({
    type: 'varchar',
    nullable: true,
    transformer: FieldTransformer,
  })
  external_user_id?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    transformer: BaseEntity.encryptJSONField('data'),
  })
  data?: any;

  @ManyToOne(() => User, (user) => user.platform_integrations, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
