import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { ActivityTemplate } from './activity-template.entity';

@Entity('activity_template_embedding')
export class ActivityTemplateEmbedding extends BaseEntity {
  constructor({ id, ...embedding }: Partial<ActivityTemplateEmbedding> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, embedding);
  }

  @Index()
  @Column({ type: 'uuid', unique: true })
  activity_template_id: string;

  @Column({ type: 'vector', nullable: false })
  embedding: number[];

  @Column({ type: 'varchar', nullable: false })
  text_source: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'varchar', nullable: true })
  model_version?: string;

  @ManyToOne(() => ActivityTemplate, (activityTemplate) => activityTemplate.embeddings, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_template_id' })
  activity_template?: ActivityTemplate;
}
