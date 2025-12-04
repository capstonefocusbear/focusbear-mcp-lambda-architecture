import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AnnouncementEntity } from './announcements.entity';

export enum ViewAction {
  VIEWED = 'viewed',
  DISMISSED = 'dismissed',
}

@Entity('announcement_views')
@Index(['user_id', 'announcement_id'], { unique: true }) // Unique constraint for idempotent operations
@Index(['user_id']) // Fast lookup for user's viewed announcements
export class AnnouncementViewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column()
  announcement_id: string;

  @Column({
    type: 'enum',
    enum: ViewAction,
    default: ViewAction.VIEWED,
  })
  action: ViewAction;

  @Column({ nullable: true })
  source: string;

  @Column({ name: 'read_at', type: 'timestamptz' })
  read_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  // Relation to Announcement
  @ManyToOne(() => AnnouncementEntity)
  @JoinColumn({ name: 'announcement_id' })
  announcement: AnnouncementEntity;
}
