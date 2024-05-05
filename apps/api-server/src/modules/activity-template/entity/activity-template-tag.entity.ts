import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ActivityTemplate } from './activity-template.entity';

@Entity('activity_template_tag')
export class ActivityTemplateTag extends BaseEntity {
  constructor({ id, ...activityTemplateTag }: Partial<ActivityTemplateTag> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...activityTemplateTag });
  }

  @Column({
    type: 'jsonb',
    transformer: BaseEntity.encryptJSONField('tags'),
  })
  tags: string[];

  @Index()
  @Column('uuid', {
    nullable: false,
  })
  activity_template_id: string;

  @ManyToOne(() => ActivityTemplate, (activityTemplate) => activityTemplate.tags, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_template_id' })
  activity_template?: ActivityTemplate;
}
