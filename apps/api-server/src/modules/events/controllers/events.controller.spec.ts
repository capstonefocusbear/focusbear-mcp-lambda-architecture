import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from '../services/events.service';
import { TrackEventDto } from '../dto/track-event.dto';
import { EventTypes } from '../domain/event-types.enum';
import { userDummy } from '../../../../test/dummies';
import { Passport } from '../../auth/domain/passport.model';

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: EventsService;

  const passport = new Passport({
    user: userDummy as any,
    isAuth: true,
    declineReason: null,
  });

  const mockEventsService = {
    handleIncomingEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    eventsService = module.get<EventsService>(EventsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('logEvent', () => {
    it('positive: should call eventsService.handleIncomingEvent with correct parameters', async () => {
      const trackEventDto: TrackEventDto = {
        event_type: EventTypes.APP_QUIT,
        event_data: { data: { quitReason: 'Testing' } },
      };

      const headers = {
        device_id: 'test-device-id',
        'app-version': '1.0.0',
      };

      mockEventsService.handleIncomingEvent.mockResolvedValue(undefined);

      await controller.logEvent(trackEventDto, passport, headers);

      expect(eventsService.handleIncomingEvent).toHaveBeenCalledWith(trackEventDto, userDummy.id, {
        device_id: 'test-device-id',
        app_version: '1.0.0',
      });
      expect(eventsService.handleIncomingEvent).toHaveBeenCalledTimes(1);
    });

    it('positive: should handle different event types', async () => {
      const trackEventDto: TrackEventDto = {
        event_type: EventTypes.BLOCK_DISTRACTING_APP,
        event_data: { data: {} },
      };

      const headers = {
        device_id: 'device-123',
        'app-version': '2.0.0',
      };

      mockEventsService.handleIncomingEvent.mockResolvedValue(undefined);

      await controller.logEvent(trackEventDto, passport, headers);

      expect(eventsService.handleIncomingEvent).toHaveBeenCalledWith(trackEventDto, userDummy.id, {
        device_id: 'device-123',
        app_version: '2.0.0',
      });
    });

    it('positive: should handle missing optional headers gracefully', async () => {
      const trackEventDto: TrackEventDto = {
        event_type: EventTypes.UNINSTALL,
      };

      const headers = {
        device_id: undefined,
        'app-version': undefined,
      };

      mockEventsService.handleIncomingEvent.mockResolvedValue(undefined);

      await controller.logEvent(trackEventDto, passport, headers);

      expect(eventsService.handleIncomingEvent).toHaveBeenCalledWith(trackEventDto, userDummy.id, {
        device_id: undefined,
        app_version: undefined,
      });
    });
  });
});
