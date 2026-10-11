import { join } from 'path';
import { DataSource } from 'typeorm';
import { typeormConfig } from '../../libs/config/src';

export const AppDataSource = new DataSource({
  ...typeormConfig(),
  // Resolve CLI migrations relative to this API config, not libs/config/src.
  migrations: [join(__dirname, 'migrations/**/*.{ts,js}')],
});
