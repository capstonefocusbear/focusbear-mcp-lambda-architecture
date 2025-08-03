import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { OnboardingDto } from '../dto/onboarding';
import { User } from './user.entity';

@Entity('user_onboarding')
export class UserOnboarding extends BaseEntity {
  constructor({ id, ...userOnboarding }: Partial<UserOnboarding> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...userOnboarding });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
    unique: true,
  })
  user_id: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    transformer: BaseEntity.encryptJSONField('onboarding'),
  })
  onboarding?: OnboardingDto;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
