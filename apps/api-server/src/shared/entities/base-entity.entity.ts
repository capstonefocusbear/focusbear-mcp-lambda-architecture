import { Column, PrimaryGeneratedColumn } from 'typeorm';

export class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({ type: 'timestamptz' })
  created_at?: string;

  @Column({ type: 'timestamptz' })
  updated_at?: string;
}
