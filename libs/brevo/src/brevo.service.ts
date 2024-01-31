import { Injectable } from '@nestjs/common';
import { TrackEventDto } from 'apps/api-server/src/modules/events/dto/track-event.dto';
import axios from 'axios';

@Injectable()
export class BrevoService {
  private httpService = axios;

  async registerBrevoEvent(email: string, event: TrackEventDto) {
    try {
      const callUrl = 'https://in-automate.brevo.com/api/v2/trackEvent';
      const config = {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'ma-key': process.env.SENDINBLUE_MA_KEY,
        },
      };
      const { event_type, user_properties, event_data } = event;
      const data = {
        email,
        event: event_type,
        properties: user_properties,
        eventdata: event_data,
      };

      return await this.httpService.post(callUrl, data, config);
    } catch (error) {
      console.error(error);
    }
  }

  async deleteContactFromBrevo(email: string) {
    try {
      const callUrl = `https://api.brevo.com/v3/contacts/${email}`;
      const config = {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
        },
      };
      await this.httpService.delete(callUrl, config);
    } catch (error) {
      console.error(error);
    }
  }
}
