import { Column, ManyToOne, OneToMany, OneToOne, JoinColumn, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { Lesson } from '../../lesson/entities/lesson.entity';
import { CourseRating } from './course-rating.entity';
import { User } from '../../user/entities/user.entity';

@Entity('courses')
export class Course extends BaseEntity {
  constructor({ id, ...data }: Partial<Course> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Column({ type: 'varchar' })
  author_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'boolean', default: false })
  is_hidden: boolean;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @OneToMany(() => Lesson, (lesson) => lesson.course, { eager: true })
  lessons?: Lesson[];

  @OneToOne(() => CourseRating, (courseRating) => courseRating.course)
  ratings?: CourseRating;
}
