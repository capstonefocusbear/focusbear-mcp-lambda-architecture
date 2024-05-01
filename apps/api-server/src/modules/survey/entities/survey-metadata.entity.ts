import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { Survey } from './survey.entity';
import { SurveyAnswer } from './survey-answer.entity';

@Entity('survey-metadata')
export class SurveyMetadata extends BaseEntity {
  constructor({ id, ...surveyMetadata }: Partial<SurveyMetadata> = {}, options = { generateId: true }) {
    super(id, options);
    Object.assign(this, { ...surveyMetadata });
  }

  @Column({
    type: 'varchar',
    nullable: false,
  })
  feature: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  device: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  operating_system: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  version: string;

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
  survey_answer_id: string;

  @OneToOne(() => Survey, (survey) => survey.id)
  @JoinColumn({ name: 'survey_id' })
  survey?: Survey;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToOne(() => SurveyAnswer, (surveyAnswer) => surveyAnswer.id)
  @JoinColumn({ name: 'survey_answer_id' })
  surveyAnswer?: SurveyAnswer;
}
