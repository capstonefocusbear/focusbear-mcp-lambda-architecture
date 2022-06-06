import 'dotenv/config';
import { scryptSync } from 'crypto';

export const typeormEncryptionConfig = (salt = 'localSalt') => ({
  key: scryptSync(process.env.TYPEORM_ENCRYPTION_KEY, salt.split('').reverse().join('salt'), 32).toString('hex'),
  algorithm: 'aes-256-cbc',
  ivLength: 16,
});
