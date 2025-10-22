import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AnnouncementEntity } from './announcements.entity';

export enum ViewAction {
  VIEWED = 'viewed',
  DISMISSED = 'dismissed',
}

@Entity('announcement_views')
@Index(['userId', 'announcementId'], { unique: true }) // Unique constraint for idempotent operations
@Index(['userId']) // Fast lookup for user's viewed announcements
export class AnnouncementViewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'announcement_id' })
  announcementId: string;

  @Column({
    type: 'enum',
    enum: ViewAction,
    default: ViewAction.VIEWED,
  })
  action: ViewAction;

  @Column({ nullable: true })
  source: string;

  @Column({ name: 'read_at', type: 'timestamptz' })
  readAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relation to Announcement
  @ManyToOne(() => AnnouncementEntity)
  @JoinColumn({ name: 'announcement_id' })
  announcement: AnnouncementEntity;
}
