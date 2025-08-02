import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { OnboardingDto } from '../dto/onboarding';

@Entity('user_onboarding')
export class UserOnboarding extends BaseEntity {
  constructor({ id, ...userOnboarding }: Partial<UserOnboarding> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...userOnboarding });
  }

  @Index()
  @Column({
    type: 'varchar',
    nullable: false,
    unique: true,
  })
  auth0_id: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    transformer: BaseEntity.encryptJSONField('onboarding'),
  })
  onboarding?: OnboardingDto;
}
