import 'dotenv/config';

export const typeormEncryptionConfig = () => ({
  key: process.env.TYPEORM_ENCRYPTION_KEY,
  algorithm: 'aes-256-cbc',
  ivLength: 16,
});
