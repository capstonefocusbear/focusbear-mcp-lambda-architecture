import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { configsArray } from './config';
import { AuthModule } from './modules/auth/auth.module';
import { PassportMiddleware } from './modules/auth/middlewares/passport.middleware';
import { HelperModule } from './modules/helper/helper.module';
import { UserModule } from './modules/user/user.module';
import { ActivityModule } from './modules/activity/activity.module';
import { DeviceModule } from './modules/device/device.module';
import { FocusModeModule } from './modules/focus-mode/focus-mode.module';

@Module({
  imports: [
    ConfigModule.forRoot({ load: configsArray }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleAsyncOptions =>
        configService.get<TypeOrmModuleOptions>('typeorm'),
    }),
    AuthModule,
    HelperModule,
    UserModule,
    ActivityModule,
    DeviceModule,
    FocusModeModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PassportMiddleware).forRoutes(':splat*');
  }
}
