import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { AnswerType } from '../domain/answer-type.enum';
import { User } from '../../user/entities/user.entity';

@Entity('survey')
export class Survey extends BaseEntity {
  constructor({ id, ...survey }: Partial<Survey> = {}, options = { generateId: true }) {
    super(id, options);
    Object.assign(this, { ...survey });
  }

  @Column({
    type: 'varchar',
    nullable: false,
  })
  question: string;

  @Column({
    type: 'varchar',
    array: true,
    default: [],
    nullable: false,
  })
  choices?: string[];

  @Column({
    type: 'enum',
    enum: AnswerType,
    nullable: false,
  })
  answer_type: AnswerType;

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  creator: string;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'creator' })
  user?: User;
}
