import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';

@Entity('app_versions')
@Index(['operating_system', 'semver_string'], { unique: true })
export class AppVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({
    type: 'enum',
    enum: OperatingSystem,
    nullable: false,
  })
  operating_system: OperatingSystem;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  semver_string: string;

  @Index()
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
  })
  is_supported: boolean;

  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
  })
  is_beta_only: boolean;

  @Column({
    type: 'text',
    nullable: true,
  })
  release_notes?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}
