import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ISendGridOptions, SendGridModule } from '@app/send-grid';
import { IJwtOptions } from '@app/jwt/interfaces';
import { JwtModule } from '@app/jwt';
import { Auth0Module } from '@app/auth0';
import { ProjectController } from './controllers/project.controller';
import { ProjectService } from './services/project.service';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectMemberRepository } from './repositories/project-member.repository';
import { UserModule } from '../user/user.module';

@Module({
  providers: [ProjectService, ProjectRepository, ProjectMemberRepository],
  exports: [ProjectService, ProjectRepository, ProjectMemberRepository],
  imports: [
    forwardRef(() => UserModule),
    ConfigModule,
    SendGridModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ISendGridOptions => configService.get('sendGrid'),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IJwtOptions => configService.get('tokens.invitation'),
    }),
    Auth0Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('auth0'),
    }),
  ],
  controllers: [ProjectController],
})
export class ProjectModule {}
