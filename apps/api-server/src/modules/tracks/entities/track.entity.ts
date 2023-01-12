import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';

@Entity('tracks')
export class Track extends BaseEntity {
  constructor({ id, ...track }: Partial<Track> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...track });
  }

  @Column({
    type: 'varchar',
  })
  name?: string;

  @Column({
    type: 'varchar',
  })
  artist?: string;

  @Column({
    type: 'varchar',
  })
  description?: string;

  @Column({
    type: 'varchar',
  })
  file_name: string;
}
