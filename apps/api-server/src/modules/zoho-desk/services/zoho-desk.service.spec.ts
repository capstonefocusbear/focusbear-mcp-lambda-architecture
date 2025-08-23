import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ZohoDeskService } from './zoho-desk.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ZohoDeskService', () => {
  let service: ZohoDeskService;

  const mockConfigValues = {
    'zoho.ZOHO_DESK_CLIENT_ID': 'test-client-id',
    'zoho.ZOHO_DESK_CLIENT_SECRET': 'test-client-secret',
    'zoho.ZOHO_ORG_ID': 'test-org-id',
    'zoho.ZOHO_WHATSAPP_CHANNEL_ID': 'test-channel-id',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZohoDeskService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfigValues[key]),
          },
        },
      ],
    }).compile();

    service = module.get<ZohoDeskService>(ZohoDeskService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initiateWhatsAppSession', () => {
    const mockTokenResponse = {
      data: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      },
    };

    const mockSessionResponse = {
      data: {
        sessionId: 'test-session-id',
        status: 'initiated',
      },
    };

    beforeEach(() => {
      mockedAxios.post.mockClear();
      mockedAxios.isAxiosError.mockClear();
    });

    it('should successfully initiate a WhatsApp session', async () => {
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse).mockResolvedValueOnce(mockSessionResponse);

      const phoneNumber = '+1234567890';
      const language = 'en';
      const cannedMessageId = 123;
      const message = 'Test message';

      const result = await service.initiateWhatsAppSession(phoneNumber, language, cannedMessageId, message);

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);

      // First call - token request
      expect(mockedAxios.post).toHaveBeenNthCalledWith(
        1,
        'https://accounts.zoho.com.au/oauth/v2/token',
        expect.stringContaining('client_id=test-client-id'),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      // Second call - WhatsApp session
      expect(mockedAxios.post).toHaveBeenNthCalledWith(
        2,
        'https://desk.zoho.com.au/api/v1/im/channels/test-channel-id/initiateSession',
        {
          receiverId: phoneNumber,
          receiverType: 'PHONENUMBER',
          cannedMessageId,
          language,
          message,
        },
        {
          headers: {
            Authorization: 'Zoho-oauthtoken test-access-token',
            orgId: 'test-org-id',
            'Content-Type': 'application/json',
          },
        },
      );

      expect(result).toEqual(mockSessionResponse.data);
    });

    it('should reuse existing access token if not expired', async () => {
      // First call to get token
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse).mockResolvedValueOnce(mockSessionResponse);

      await service.initiateWhatsAppSession('+1234567890', 'en', 123, 'Test');

      mockedAxios.post.mockClear();

      // Second call should reuse token
      mockedAxios.post.mockResolvedValueOnce(mockSessionResponse);

      await service.initiateWhatsAppSession('+0987654321', 'es', 123, 'Test 2');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://desk.zoho.com.au/api/v1/im/channels/test-channel-id/initiateSession',
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Zoho-oauthtoken test-access-token',
          }),
        }),
      );
    });

    it('should throw error when token request fails', async () => {
      const tokenError = new Error('Token request failed');
      mockedAxios.post.mockRejectedValueOnce(tokenError);

      await expect(service.initiateWhatsAppSession('+1234567890', 'en', 123, 'Test')).rejects.toThrow(
        'Failed to authenticate with Zoho API',
      );

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should throw detailed error when WhatsApp session initiation fails', async () => {
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);

      const sessionError = {
        response: {
          status: 400,
          data: {
            message: 'Invalid phone number format',
          },
        },
        message: 'Request failed',
      };

      mockedAxios.post.mockRejectedValueOnce(sessionError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(service.initiateWhatsAppSession('+invalid', 'en', 123, 'Test')).rejects.toThrow(
        'Failed to initiate WhatsApp session: 400 - Invalid phone number format',
      );

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should throw generic error when session fails without Axios error', async () => {
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);

      const genericError = new Error('Network error');
      mockedAxios.post.mockRejectedValueOnce(genericError);
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(service.initiateWhatsAppSession('+1234567890', 'en', 123, 'Test')).rejects.toThrow('Network error');

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle missing error message in Axios response', async () => {
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);

      const sessionError = {
        response: {
          status: 500,
          data: {},
        },
        message: 'Internal server error',
      };

      mockedAxios.post.mockRejectedValueOnce(sessionError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(service.initiateWhatsAppSession('+1234567890', 'en', 123, 'Test')).rejects.toThrow(
        'Failed to initiate WhatsApp session: 500 - Internal server error',
      );
    });
  });

  describe('token management', () => {
    const mockTokenResponse = {
      data: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      },
    };

    const mockSessionResponse = {
      data: {
        sessionId: 'test-session-id',
        status: 'initiated',
      },
    };

    it('should request new token when current token is expired', async () => {
      // First call - get initial token
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse).mockResolvedValueOnce(mockSessionResponse);

      await service.initiateWhatsAppSession('+1234567890', 'en', 123, 'Test');

      // Mock Date.now to simulate token expiration
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + 4000 * 1000); // 4000 seconds later

      mockedAxios.post.mockClear();

      // Second call - should request new token
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            ...mockTokenResponse.data,
            access_token: 'new-access-token',
          },
        })
        .mockResolvedValueOnce(mockSessionResponse);

      await service.initiateWhatsAppSession('+0987654321', 'es', 123, 'Test 2');

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);

      // Check that new token was requested
      expect(mockedAxios.post).toHaveBeenNthCalledWith(
        1,
        'https://accounts.zoho.com.au/oauth/v2/token',
        expect.any(String),
        expect.any(Object),
      );

      // Check that new token was used
      expect(mockedAxios.post).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Zoho-oauthtoken new-access-token',
          }),
        }),
      );

      Date.now = originalDateNow;
    });
  });
});
