import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { Survey } from './survey.entity';
import { FieldTransformer } from '../../../shared/utils/helpers';
import { SurveyMetadata } from './survey-metadata.entity';

@Entity('survey-answer')
export class SurveyAnswer extends BaseEntity {
  constructor({ id, ...answer }: Partial<SurveyAnswer> = {}, options = { generateId: true }) {
    super(id, options);
    Object.assign(this, { ...answer });
  }

  @Column({
    type: 'varchar',
    nullable: false,
    transformer: FieldTransformer,
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

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  survey_metadata_id: string;

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

  @ManyToOne(() => SurveyMetadata, (surveyMetadata) => surveyMetadata.id)
  @JoinColumn({ name: 'survey_metadata_id' })
  surveyMetadata?: SurveyMetadata;
}
