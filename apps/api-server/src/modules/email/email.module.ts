import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ISendGridOptions, SendGridModule } from '@app/send-grid';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailProcessor } from './services/email.processor';
import { ProgressEmailTemplateService } from './services/progress-email-template/progress-email-template.service';
import { EmailTemplateCompilerService } from './services/email-template-compiler/email-template-compiler.service';
import { UserModule } from '../user/user.module';
import { DeviceModule } from '../device/device.module';
import { AnnouncementsModule } from '../announcements/announcements.module';

@Module({
  imports: [
    SendGridModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ISendGridOptions => configService.get('sendGrid'),
    }),
    BullModule.registerQueue({
      name: 'emailQueue',
    }),
    forwardRef(() => UserModule),
    DeviceModule,
    AnnouncementsModule,
  ],
  providers: [EmailProcessor, ProgressEmailTemplateService, EmailTemplateCompilerService],
  exports: [BullModule, ProgressEmailTemplateService, EmailTemplateCompilerService],
})
export class EmailModule {}
