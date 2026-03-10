import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';

@Entity('video_metadata')
export class VideoMetadata extends BaseEntity {
  constructor({ id, ...video }: Partial<VideoMetadata> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...video });
  }

  @Column({
    type: 'varchar',
    nullable: false,
    unique: true,
  })
  id?: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  video_url?: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  title?: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  duration?: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  thumbnail_url?: string;

  @Column({
    type: 'integer',
    nullable: true,
  })
  thumbnail_width?: number;

  @Column({
    type: 'integer',
    nullable: true,
  })
  thumbnail_height?: number;
}
