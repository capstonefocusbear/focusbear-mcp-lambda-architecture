import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum AnnouncementType {
  RELEASE = 'release',
  EVENT = 'event',
  SURVEY = 'survey',
  MAINTENANCE = 'maintenance',
}

export enum AnnouncementPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AnnouncementAudience {
  os?: string[];
  min_version_code?: number;
  locales?: string[];
  [key: string]: any;
}

@Entity('announcements')
export class AnnouncementEntity {
  @PrimaryColumn('varchar')
  id: string; // e.g. ann_2023_10_maintenance

  @Column({
    type: 'enum',
    enum: AnnouncementType,
  })
  type: AnnouncementType;

  @Column()
  heading: string;

  @Column('text')
  details: string;

  @Column({ name: 'expiry_date', type: 'timestamp', nullable: true })
  expiryDate: Date;

  @Column({
    type: 'enum',
    enum: AnnouncementPriority,
    default: AnnouncementPriority.MEDIUM,
  })
  priority: AnnouncementPriority;

  @Column('jsonb', { nullable: true })
  audience: AnnouncementAudience;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
