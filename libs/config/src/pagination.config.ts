import { registerAs } from '@nestjs/config';

export const paginationCongif = registerAs('pagination', () => ({
  defaultLimit: 13,
}));
