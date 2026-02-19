import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Team } from './team.entity';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';

@Entity('team_join_codes')
export class TeamJoinCode extends BaseEntity {
  constructor({ id, ...teamJoinCode }: Partial<TeamJoinCode> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...teamJoinCode });
  }

  @Index()
  @Column({ type: 'uuid', nullable: false })
  team_id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', nullable: false })
  code: string;

  @Column({ type: 'boolean', nullable: false, default: true })
  is_active: boolean;

  @Column({ type: 'int', nullable: true })
  max_redemptions: number; // null = unlimited, 1 = single-use, or any positive integer

  @Column({ type: 'int', nullable: false, default: 0 })
  redemption_count: number;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date;

  @Column({ type: 'uuid', nullable: false })
  created_by: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;
}
