import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { UserConsentMetadata } from '../domain/user-consent-metadate.model';
import { UserConsentTypes } from '../domain/user-consent.enum';
import { User } from './user.entity';

@Entity('user_consent')
export class UserConsent extends BaseEntity {
  constructor({ id, ...user }: Partial<UserConsent> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...user });
  }

  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'varchar',
  })
  consent_type: UserConsentTypes;

  @Column({
    type: 'boolean',
  })
  consent_status?: boolean;

  @Column({
    type: 'timestamptz',
  })
  withdrawal_date?: Date;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata?: UserConsentMetadata;

  @ManyToOne(() => User, (user) => user.consents, { onDelete: 'NO ACTION', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
