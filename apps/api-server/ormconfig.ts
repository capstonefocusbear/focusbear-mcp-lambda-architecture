import { DataSource } from 'typeorm';
import { typeormConfig } from './src/config';

export const AppDataSource = new DataSource(typeormConfig());
