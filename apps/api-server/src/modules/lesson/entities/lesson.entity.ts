import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { Course } from '../../course/entities/course.entity';

@Entity('lessons')
export class Lesson extends BaseEntity {
  constructor({ id, ...data }: Partial<Lesson> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Index()
  @Column({ type: 'varchar' })
  course_id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 2000 })
  content: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @ManyToOne(() => Course, (course) => course.id, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course?: Course;
}
