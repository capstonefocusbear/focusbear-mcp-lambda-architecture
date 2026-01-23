import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';

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

  @Column({ type: 'varchar', nullable: true })
  details_url?: string;

  @Column({ type: 'timestamp' })
  expiry_date: Date;

  @Column({
    type: 'enum',
    enum: AnnouncementPriority,
    default: AnnouncementPriority.MEDIUM,
  })
  priority: AnnouncementPriority;

  @Column({
    type: 'enum',
    enum: OperatingSystem,
    default: OperatingSystem.Unknown,
  })
  operating_system: OperatingSystem;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
