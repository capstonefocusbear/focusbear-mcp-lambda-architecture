import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';

@Entity('app_versions')
@Index(['operatingSystem', 'semverString'], { unique: true })
export class AppVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({
    type: 'enum',
    enum: OperatingSystem,
    nullable: false,
  })
  operatingSystem: OperatingSystem;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  semverString: string;

  @Index()
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
  })
  isSupported: boolean;

  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
  })
  isBetaOnly: boolean;

  @Column({
    type: 'text',
    nullable: true,
  })
  releaseNotes?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
