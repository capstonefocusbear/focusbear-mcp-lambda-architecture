import { Body, Controller, Post } from '@nestjs/common';
import { ZohoService } from '../services/zoho.service';
import { TestWhatsappDto } from '../dto/test-whatsapp.dto';

@Controller('zoho')
export class ZohoController {
  constructor(private readonly zohoService: ZohoService) {}

  @Post('test-whatsapp')
  async testWhatsapp(@Body() body: TestWhatsappDto) {
    return this.zohoService.initiateWhatsAppSession(
      body.phoneNumber,
      'en',
      body.cannedMessageId,
      'Message from focusbear',
    );
  }
}
