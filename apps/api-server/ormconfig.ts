import { DataSource } from 'typeorm';
import { typeormConfig } from '../../libs/config/src';

export const AppDataSource = new DataSource(typeormConfig());
