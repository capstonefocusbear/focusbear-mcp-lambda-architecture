import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { Survey } from './survey.entity';

@Entity('survey_answer')
export class SurveyAnswer extends BaseEntity {
  constructor({ id, ...answer }: Partial<SurveyAnswer> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...answer });
  }

  @Column({
    type: 'varchar',
    nullable: false,
    transformer: BaseEntity.encryptField('reply'),
  })
  reply: string;

  @Column({
    type: 'smallint',
    nullable: true,
  })
  @Column({ type: 'smallint', nullable: true })
  rating?: number;

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  survey_id: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  completed: boolean;

  @ManyToOne(() => Survey, (survey) => survey.id)
  @JoinColumn({ name: 'survey_id' })
  survey?: Survey;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
