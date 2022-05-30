import { randomUUID } from 'crypto';
import { Column, PrimaryGeneratedColumn } from 'typeorm';

export class BaseEntity {
  constructor(id?: string, { generateId } = { generateId: false }) {
    this.id = generateId ? randomUUID() : id;
  }

  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({ type: 'timestamptz' })
  created_at?: string;

  @Column({ type: 'timestamptz' })
  updated_at?: string;
}
