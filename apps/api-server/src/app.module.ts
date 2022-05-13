import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { configsArray } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({ load: configsArray }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleAsyncOptions =>
        configService.get<TypeOrmModuleOptions>('typeorm'),
    }),
  ],
})
export class AppModule {}
