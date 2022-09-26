import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ISendGridOptions } from './interfaces';
import { SendGridModule } from './send-grid.module';
import { SendGridService } from './send-grid.service';
import { configsArray } from '../../../apps/api-server/src/config';

describe('SendGridService', () => {
  let service: SendGridService;
  const payload = {
    to: 'zhygliy@itirra.com',
    from: 'testuser@aidaforparents.com',
    text: 'SendGrid is home!',
    subject: 'Sending with Twilio SendGrid is Fun',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ load: configsArray }),
        SendGridModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService): ISendGridOptions => configService.get('sendGrid'),
        }),
      ],
    }).compile();

    service = module.get<SendGridService>(SendGridService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it.skip('should be defined', async () => {
      const invoke = await service.sendEmail(payload);
      expect(invoke).toBeDefined();
    });
  });
});
