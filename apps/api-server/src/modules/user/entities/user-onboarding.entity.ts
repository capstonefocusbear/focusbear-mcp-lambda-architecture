import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { OnboardingDto } from '../dto/onboarding';
import { User } from './user.entity';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';

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
  onboarding: OnboardingDto;

  @Column({
    type: 'enum',
    nullable: false,
    enum: OperatingSystem,
    default: OperatingSystem.Unknown,
  })
  platform: OperatingSystem;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
