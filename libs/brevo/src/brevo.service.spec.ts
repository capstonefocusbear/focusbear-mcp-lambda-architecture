import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { TrackEventDto } from '../../../apps/api-server/src/modules/events/dto/track-event.dto';
import { EventTypes } from '../../../apps/api-server/src/modules/events/domain/event-types.enum';
import { BrevoService } from './brevo.service';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BrevoService', () => {
  let service: BrevoService;
  process.env = { SENDINBLUE_MA_KEY: 'test-key', BREVO_API_KEY: 'test-brevo-key' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BrevoService],
    }).compile();

    service = module.get<BrevoService>(BrevoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerBrevoEvent', () => {
    const configDummy = {
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'ma-key': 'test-key',
      },
    };
    it('positive: should send POST request to Brevo api', async () => {
      const callUrlDummy = 'https://in-automate.brevo.com/api/v2/trackEvent';
      const dummyEmail = 'test@mail.com';
      const eventDummy: TrackEventDto = { event_type: EventTypes.APP_QUIT, event_data: { data: { quantity: 10 } } };
      const dataDummy = {
        email: dummyEmail,
        event: EventTypes.APP_QUIT,
        properties: undefined,
        eventdata: { data: { quantity: 10 } },
      };
      await service.registerBrevoEvent(dummyEmail, eventDummy);

      expect(mockedAxios.post).toHaveBeenCalledWith(callUrlDummy, dataDummy, configDummy);
    });
  });

  describe('deleteContactFromBrevo', () => {
    it('positive: should send DELETE request to Brevo API', async () => {
      const dummyEmail = 'test@mail.com';
      const callUrlDummy = `https://api.brevo.com/v3/contacts/${dummyEmail}`;
      const configDummy = {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': 'test-brevo-key',
        },
      };

      await service.deleteContactFromBrevo(dummyEmail);

      expect(mockedAxios.delete).toHaveBeenCalledWith(callUrlDummy, configDummy);
    });
  });
});
