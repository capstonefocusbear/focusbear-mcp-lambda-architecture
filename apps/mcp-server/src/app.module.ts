import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino'; 

import { ExternalMcpModule } from './auth/auth.module';
import { McpModule } from './mcp/mcp.module';
import { configsArray } from '@app/config'; 

// 1. Import it right from the same folder
import { AppController } from './app.controller'; 

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configsArray, 
      envFilePath: '../../.env',
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => config.get('pino'),
    }),
    ExternalMcpModule, 
    McpModule,         
  ],
  // 2. Register it here
  controllers: [AppController], 
})
export class AppModule {}