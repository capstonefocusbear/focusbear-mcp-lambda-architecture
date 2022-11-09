import { randomUUID } from 'crypto';
import { Column, PrimaryGeneratedColumn } from 'typeorm';
import { EncryptionTransformer, JSONEncryptionTransformer } from 'typeorm-encrypted';
import { typeormEncryptionConfig } from '../../config/typeorm-encryption.config';

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

  protected static encryptField?(localSalt?: string) {
    const config = typeormEncryptionConfig(localSalt);
    return new EncryptionTransformer(config);
  }

  protected static encryptJSONField?(localSalt?: string) {
    const config = typeormEncryptionConfig(localSalt);
    return new JSONEncryptionTransformer(config);
  }
}
