import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

@Injectable()
export class ZohoService {
  private readonly logger = new Logger(ZohoService.name);

  private accessToken: string | null = null;

  private refreshToken: string | null = null;

  private tokenExpiryTime: number | null = null;

  private readonly clientId: string;

  private readonly clientSecret: string;

  private readonly orgId: string;

  private readonly whatsappChannelId: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('zoho.ZOHO_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('zoho.ZOHO_CLIENT_SECRET') || '';
    this.orgId = this.configService.get<string>('zoho.ZOHO_ORG_ID') || '';
    this.whatsappChannelId = this.configService.get<string>('zoho.ZOHO_WHATSAPP_CHANNEL_ID') || '';
    this.refreshToken = this.configService.get<string>('zoho.ZOHO_REFRESH_TOKEN') || '';

    if (!this.clientId || !this.clientSecret || !this.orgId) {
      this.logger.warn(
        'Missing Zoho configuration. Please ensure ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_ORG_ID are set.',
      );
    }

    if (!this.whatsappChannelId) {
      this.logger.warn('Missing ZOHO_WHATSAPP_CHANNEL_ID configuration.');
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiryTime && Date.now() < this.tokenExpiryTime) {
      return this.accessToken;
    }

    try {
      const tokenUrl = 'https://accounts.zoho.com.au/oauth/v2/token';
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        scope: 'Desk.InstantMessages.ALL,Desk.tickets.ALL,Desk.basic.ALL',
      });

      this.logger.log('Requesting new access token from Zoho using refresh token');

      const response = await axios.post<TokenResponse>(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const tokenData = response.data;
      this.accessToken = tokenData.access_token;
      this.tokenExpiryTime = Date.now() + (tokenData.expires_in - 300) * 1000;

      this.logger.log('Zoho token response:', tokenData);
      this.logger.log('Successfully obtained Zoho access token');
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get Zoho access token', error);
      throw new Error('Failed to authenticate with Zoho API');
    }
  }

  async initiateWhatsAppSession(
    phoneNumber: string,
    language: string,
    cannedMessageId: number,
    message: string,
  ): Promise<any> {
    this.logger.log(`WhatsApp session initiation requested for ${phoneNumber}`);
    this.logger.log(`Language: ${language}, Canned Message ID: ${cannedMessageId}`);
    this.logger.log(`Message: ${message}`);

    try {
      // Get valid access token
      const accessToken = await this.getAccessToken();

      // Construct the API endpoint
      const apiUrl = `https://desk.zoho.com.au/api/v1/im/channels/${this.whatsappChannelId}/initiateSession`;

      // Construct the request body according to Zoho Desk API documentation
      const requestBody = {
        receiverId: phoneNumber,
        receiverType: 'PHONENUMBER',
        cannedMessageId,
        language,
        message,
      };

      this.logger.log('Initiating WhatsApp session with Zoho Desk API');
      this.logger.debug('Request body:', requestBody);

      // Make the POST request
      const headers = {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        orgId: this.orgId,
        'Content-Type': 'application/json',
      };

      this.logger.log('Initiating session with headers:', headers);

      const response = await axios.post(apiUrl, requestBody, {
        headers,
      });

      this.logger.log('WhatsApp session initiated successfully');
      this.logger.debug('Response:', response.data);

      return response.data;
    } catch (error) {
      this.logger.error('Failed to initiate WhatsApp session', error);

      if (axios.isAxiosError(error)) {
        this.logger.error('Response status:', error.response?.status);
        this.logger.error('Response data:', error.response?.data);

        throw new Error(
          `Failed to initiate WhatsApp session: ${error.response?.status} - ${
            error.response?.data?.message || error.message
          }`,
        );
      }

      throw error;
    }
  }
}
